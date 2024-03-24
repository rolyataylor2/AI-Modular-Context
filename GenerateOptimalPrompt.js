
const axios = require('axios');
const axiosRetry = require('axios-retry');

// Configure exponential backoff
axiosRetry(axios, {
  retries: 3, // Number of retries
  retryDelay: (retryCount) => {
    return retryCount * 1000; // Delay in milliseconds, increasing with each retry
  },
  retryCondition: (error) => {
    // Retry only if the error is a 429 Too Many Requests error
    return error.response && error.response.status === 429;
  },
});
const { retry, stop_after_attempt, wait_exponential } = require('@lifeomic/attempt');
const { Table } = require('console-table-printer');

// K is a constant factor that determines how much ratings change
const K = 32;

const CANDIDATE_MODEL = 'claude-3-opus-20240229';
const CANDIDATE_MODEL_TEMPERATURE = 0.9;

const GENERATION_MODEL = 'claude-3-haiku-20240307';
const GENERATION_MODEL_TEMPERATURE = 0.7;
const GENERATION_MODEL_MAX_TOKENS = 75;

const TEST_CASE_MODEL = 'claude-3-opus-20240229';
const TEST_CASE_MODEL_TEMPERATURE = 0.7;

const NUMBER_OF_TEST_CASES = 20;

const RANKING_MODEL = 'claude-3-opus-20240229';
const RANKING_MODEL_TEMPERATURE = 0.3;

const NUMBER_OF_PROMPTS = 15; // this determines how many candidate prompts to generate... the higher, the more expensive, but the better the results will be
const N_RETRIES = 3;  // number of times to retry a call to the ranking model if it fails
function removeFirstLine(testString) {
  if (testString.startsWith("Here") && testString.split("\n")[0].trim().endsWith(":")) {
    return testString.replace(/^.*\n/, '');
  }
  return testString;
}

async function generateCandidatePrompts(apiKey, description, inputVariables, testCases, numberOfPrompts) {
  const headers = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  };

  const variableDescriptions = inputVariables.map(variable => `${variable.variable}: ${variable.description}`).join('\n');

  const data = {
    "model": CANDIDATE_MODEL,
    "max_tokens": 1500,
    "temperature": CANDIDATE_MODEL_TEMPERATURE,
    "system": `Your job is to generate system prompts for Claude 3, given a description of the use-case, some test cases/input variable examples that will help you understand what the prompt will need to be good at.
The prompts you will be generating will be for freeform tasks, such as generating a landing page headline, an intro paragraph, solving a math problem, etc.
In your generated prompt, you should describe how the AI should behave in plain English. Include what it will see, and what it's allowed to output.
<most_important>Make sure to incorporate the provided input variable placeholders into the prompt, using placeholders like {{{{VARIABLE_NAME}}}} for each variable. Ensure you place placeholders inside four squiggly lines like {{{{VARIABLE_NAME}}}}. At inference time/test time, we will slot the variables into the prompt, like a template.</most_important>
Be creative with prompts to get the best possible results. The AI knows it's an AI -- you don't need to tell it this.
You will be graded based on the performance of your prompt... but don't cheat! You cannot include specifics about the test cases in your prompt. Any prompts with examples will be disqualified.
Here are the input variables and their descriptions:
${variableDescriptions}
Most importantly, output NOTHING but the prompt (with the variables contained in it like {{{{VARIABLE_NAME}}}}). Do not include anything else in your message.`,
    "messages": [
      { "role": "user", "content": `Here are some test cases:\`${JSON.stringify(testCases)}\`\n\nHere is the description of the use-case: \`${description.trim()}\`\n\nRespond with your flexible system prompt, and nothing else. Be creative, and remember, the goal is not to complete the task, but write a prompt that will complete the task.` },
    ]
  };

  const prompts = [];

  for (let i = 0; i < numberOfPrompts; i++) {
    const response = await axios.post("https://api.anthropic.com/v1/messages", data, { headers });
    const responseText = response.data.content[0].text;
    prompts.push(removeFirstLine(responseText));
  }

  return prompts;
}

function expectedScore(r1, r2) {
  return 1 / (1 + Math.pow(10, (r2 - r1) / 400));
}

function updateElo(r1, r2, score1) {
  const e1 = expectedScore(r1, r2);
  const e2 = expectedScore(r2, r1);
  return [r1 + K * (score1 - e1), r2 + K * ((1 - score1) - e2)];
}

// Get Score - retry up to N_RETRIES times, waiting exponentially between retries.
async function getScore(apiKey, description, testCase, pos1, pos2, inputVariables, rankingModelName, rankingModelTemperature) {
  const headers = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  };

  const data = {
    "model": RANKING_MODEL,
    "max_tokens": 1,
    "temperature": rankingModelTemperature,
    "system": `Your job is to rank the quality of two outputs generated by different prompts. The prompts are used to generate a response for a given task.
You will be provided with the task description, input variable values, and two generations - one for each system prompt.
Rank the generations in order of quality. If Generation A is better, respond with 'A'. If Generation B is better, respond with 'B'.
Remember, to be considered 'better', a generation must not just be good, it must be noticeably superior to the other.
Also, keep in mind that you are a very harsh critic. Only rank a generation as better if it truly impresses you more than the other.
Respond with your ranking ('A' or 'B'), and nothing else. Be fair and unbiased in your judgement.`,
    "messages": [
      { "role": "user", "content": `Task: ${description.trim()}
Variables: ${JSON.stringify(testCase.variables)}
Generation A: ${removeFirstLine(pos1)}
Generation B: ${removeFirstLine(pos2)}` },
    ]
  };

  const response = await retry(async () => {
    const result = await axios.post("https://api.anthropic.com/v1/messages", data, { headers });
    return result.data.content[0].text;
  }, {
    maxAttempts: N_RETRIES,
    delay: 1000,
    factor: 2,
    jitter: true,
  });

  return response;
}

async function getGeneration(apiKey, prompt, testCase, inputVariables) {
  const headers = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  };

  // Replace variable placeholders in the prompt with their actual values from the test case
  for (const varDict of testCase.variables) {
    for (const [variableName, variableValue] of Object.entries(varDict)) {
      prompt = prompt.replace(`{{{{${variableName}}}}`, variableValue);
    }
  }

  const data = {
    "model": GENERATION_MODEL,
    "max_tokens": GENERATION_MODEL_MAX_TOKENS,
    "temperature": GENERATION_MODEL_TEMPERATURE,
    "system": 'Complete the task perfectly.',
    "messages": [
      { "role": "user", "content": prompt },
    ]
  };

  const response = await retry(async () => {
    const result = await axios.post("https://api.anthropic.com/v1/messages", data, { headers });
    return result.data.content[0].text;
  }, {
    maxAttempts: N_RETRIES,
    delay: 1000,
    factor: 2,
    jitter: true,
  });

  return response;
}

async function testCandidatePrompts(apiKey, testCases, description, inputVariables, prompts) {
  // Initialize each prompt with an ELO rating of 1200
  const promptRatings = {};
  for (const prompt of prompts) {
    promptRatings[prompt] = 1200;
  }

  // Calculate total rounds for progress bar
  const totalRounds = testCases.length * prompts.length * (prompts.length - 1) / 2;

  // For each pair of prompts
  for (let i = 0; i < prompts.length; i++) {
    for (let j = i + 1; j < prompts.length; j++) {
      const prompt1 = prompts[i];
      const prompt2 = prompts[j];

      // For each test case
      for (const testCase of testCases) {
        // Generate outputs for each prompt
        const generation1 = await getGeneration(apiKey, prompt1, testCase, inputVariables);
        const generation2 = await getGeneration(apiKey, prompt2, testCase, inputVariables);

        // Rank the outputs
        const score1 = await getScore(apiKey, description, testCase, generation1, generation2, inputVariables, RANKING_MODEL, RANKING_MODEL_TEMPERATURE);
        const score2 = await getScore(apiKey, description, testCase, generation2, generation1, inputVariables, RANKING_MODEL, RANKING_MODEL_TEMPERATURE);

        // Convert scores to numeric values
        const numScore1 = score1 === 'A' ? 1 : score1 === 'B' ? 0 : 0.5;
        const numScore2 = score2 === 'B' ? 1 : score2 === 'A' ? 0 : 0.5;

        // Average the scores
        const score = (numScore1 + numScore2) / 2;

        // Update ELO ratings
        let r1 = promptRatings[prompt1];
        let r2 = promptRatings[prompt2];
        [r1, r2] = updateElo(r1, r2, score);
        promptRatings[prompt1] = r1;
        promptRatings[prompt2] = r2;

        // Print the winner of this round
        if (score > 0.5) {
          console.log(`Winner: ${prompt1}`);
        } else if (score < 0.5) {
          console.log(`Winner: ${prompt2}`);
        } else {
          console.log("Draw");
        }
      }
    }
  }

  return promptRatings;
}

async function generateOptimalPrompt(apiKey, description, inputVariables, numTestCases = 10, numberOfPrompts = 10) {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const testCases = await generateTestCases(apiKey, description, inputVariables, numTestCases);
      const prompts = await generateCandidatePrompts(apiKey, description, inputVariables, testCases, numberOfPrompts);
      console.log('Here are the possible prompts:', prompts);
      const promptRatings = await testCandidatePrompts(apiKey, testCases, description, inputVariables, prompts);

      const optimalPrompt = Object.entries(promptRatings).sort((a, b) => b[1] - a[1])[0][0];
      return optimalPrompt;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        retryCount++;
        const retryAfter = error.response.headers['retry-after'];
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, retryCount) * 1000;
        console.log(`Rate limit exceeded. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retries exceeded. Unable to generate optimal prompt.');
}

async function generateTestCases(apiKey, description, inputVariables, numTestCases) {
  const headers = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  };

  const variableDescriptions = inputVariables.map(variable => `${variable.variable}: ${variable.description}`).join('\n');

  const data = {
    "model": CANDIDATE_MODEL,
    "max_tokens": 1500,
    "temperature": CANDIDATE_MODEL_TEMPERATURE,
    "system": `You are an expert at generating test cases for evaluating AI-generated content.
Your task is to generate a list of ${numTestCases} test case prompts based on the given description and input variables.
Each test case should be a JSON object with a 'test_design' field containing the overall idea of this test case, and a list of additional JSONs for each input variable, called 'variables'.
The test cases should be diverse, covering a range of topics and styles relevant to the description.
Here are the input variables and their descriptions:
${variableDescriptions}
Return the test cases as a JSON list, with no other text or explanation.`,
    "messages": [
      { "role": "user", "content": `Description: ${description.trim()}\n\nGenerate the test cases. Make sure they are really, really great and diverse:` },
    ]
  };

  const response = await axios.post("https://api.anthropic.com/v1/messages", data, { headers });
  const responseText = response.data.content[0].text;
  const testCases = JSON.parse(responseText);
  console.log('Here are the test cases:', testCases);
  return testCases;
}

module.exports = { generateOptimalPrompt };