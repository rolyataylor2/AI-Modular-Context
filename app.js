const express = require('express');
const path = require('path');
const app = express();
const port = 80;
const fs = require('fs');
const bodyParser = require('body-parser');

function resolvePath(relativePath) {
  return path.join(__dirname, relativePath);
}

// Serve static files from the "public" directory
app.use(express.static(resolvePath('public')));
app.use(express.json({ limit: '50mb' }));

// Serve index.html at the root
app.get('/', (req, res) => {
  res.sendFile(resolvePath('public/index.html'));
});


// Generate Ideal Prompt
const { generateOptimalPrompt } = require('./generateOptimalPrompt');
app.post('/generate-prompt', async (req, res) => {
  const { apiKey, description, inputVariables, numTestCases, numberOfPrompts } = req.body;
  console.log('Looking for ideal prompt...')
  console.log(JSON.stringify(req.body))
  try {
    var results = await generateOptimalPrompt(apiKey, description, inputVariables, numTestCases, numberOfPrompts);

    res.status(200).json({ table: results });
  } catch (error) {
    console.error('Error generating optimal prompt:', error);
    res.status(500).json({ error: 'An error occurred while generating the optimal prompt' });
  }
});
// Serve completions.js at /Chat/Completions

function GenerateErrorCompletion(error) {
  return {
    content:[
      {
        text:"Error Occurred: " + error
      }
    ]
  };
}
app.post('/Chat/Completions', (req, res) => {
  // Collect Data
  const data = {
    system: req.body.system,
    messages: req.body.messages,
    model: req.body.model,
    max_tokens: req.body.max_tokens,
    temperature: 0
  }
  console.log(data);
  const API_FILE = resolvePath('public/API_KEY');

  // Load from file
  try {
    if (req.body.api_key_save) {
      fs.writeFileSync(API_FILE, req.body.api_key, { encoding: 'utf-8' });
    }
    API_KEY = req.body.api_key || fs.readFileSync(API_FILE, { encoding: 'utf-8' });
  } catch (err) {
    console.log(err);
    API_KEY = req.body.api_key
  }
  if (API_KEY.length < 10) {
    res.json(GenerateErrorCompletion("INVALID API KEY"));
    return;
  }

  // Do API Call
  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(data)
  })
    .then(response => response.json())
    .then((data) => {
      console.log(data);
      if (data.error !== void 0) res.json(GenerateErrorCompletion(JSON.stringify(data)))
      else res.json(data);
    }).catch((error) => {
      res.json(GenerateErrorCompletion(JSON.stringify(error)));
    });
});

app.listen(port, () => {
  console.log(`Successfully listening on Port:${port}`);
  console.log('----- Please open the following page in your browser -----');
  console.log(' ')
  console.log('\u001b]8;;http://127.0.0.1\u0007http://127.0.0.1\u001b]8;;\u0007');
  console.log(' ');
  console.log('-----------------------------------------------------------')
  
});
