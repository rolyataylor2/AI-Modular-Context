
API_URL = 'http://127.0.0.1/Chat/Completions';
API_Object = {
    model: "claude-3-sonnet-20240229",
    max_tokens: 1000,
    temperature: 0,
    system: " ",
    messages: []
}
API_AdditionalMessages = [];
function API_Key() {
    return document.getElementById('API_KEY').value;
}
function API_Key_Save() {
    return document.getElementById('API_KEY_SAVE').checked;
}
async function API_LoadBase(model) {
    try {
        const response = await fetch(`./Instances/Aidyn%20-%20${model}.json`);
        if (model === 'Haiku')
            API_Object.model = "claude-3-haiku-20240307"

        // Check if the response is ok (status in the range 200-299)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json(); // Parses the JSON response
        API_Object.messages = data;
        console.log('Loaded Defaults: ' + data.length + ' Messages')
        return data;
    } catch (error) {
        console.error("Error fetching JSON: ", error);
        return null; // or handle the error as you see fit
    }
}
function API_RemoveLastMessage() {
    API_AdditionalMessages.pop()
    ChatWindowUpdate();
}
function API_AddUserMessage(message) {
    const messageLength = API_AdditionalMessages.length-1;
    if (messageLength > -1 && API_AdditionalMessages[messageLength].role === 'user') {
        // Append message
        API_AdditionalMessages[messageLength].content += '\n' + message;
        ChatWindowUpdate()
        return;
    }
    API_AdditionalMessages.push({
        'role': 'user',
        'content': message
    });
    ChatWindowUpdate()
}
function API_AddBotMessage(message) {
    API_AdditionalMessages.push({
        'role': 'assistant',
        'content': message
    });
    ChatWindowUpdate();
}
function estimateTokens(messages) {
    // A very simple tokenizer function
    function simpleTokenize(text) {
        // Splitting by spaces and punctuation, this regex can be adjusted
        if (text === void 0) return 0;
        const tokens = text.split(/[\s,.!?]+/);
        return tokens.filter(token => token.length > 0);
    }

    let totalTokenCount = 0;

    messages.forEach(message => {
        const { role, content } = message;
        // Assuming you want to count tokens in both role and content
        const roleTokens = simpleTokenize(role);
        const contentTokens = simpleTokenize(content);
        const messageTokenCount = roleTokens.length + contentTokens.length;
        totalTokenCount += messageTokenCount;

        console.log(`Message "${content.substring(0, 30)}..." tokens:`, messageTokenCount);
    });

    console.log('Estimated total tokens:', totalTokenCount);
    return totalTokenCount;
}
function API_FetchBotMessage() {
    var data = { ...API_Object };
    data.messages = [...API_Object.messages, ...API_AdditionalMessages];
    var estimatedTokens = estimateTokens(data.messages);
    if (!confirm(`This will use ${estimatedTokens}, Are you sure?`)) return;
    data.api_key = API_Key();
    data.api_key_save = API_Key_Save();
    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            function wrapLinesWithPTags(text) {
                return text.split('\n').map(line => {
                    let lineContent = line;
                    let pClass = '';
            
                    // Check if the line does not end in a period
                    if (!line.endsWith('.')) {
                        pClass = ' class="bulleted"';
                    }

                    // Check if the line contains a colon and split at the first colon if it does
                    if (line.includes(':')) {
                        const parts = line.split(/:(.+)/);
                        const beforeColonBold = `<strong>${parts[0]}:</strong>`;
                        const restOfLine = parts[1] ? parts[1] : '';
                        lineContent = beforeColonBold + restOfLine;
                        pClass = ' class="bold"';
                    }
            
                    // Check if the line starts with a lowercase letter
                    if (line.match(/^[a-z]/)) {
                        lineContent = `<i>${lineContent}</i>`;
                        pClass = ' class="italic"';
                    }
            
                    
            
                    // Finally, wrap the potentially modified line in <p> tags and return
                    return lineContent.trim() ? `<p${pClass}>${lineContent}</p>` : '';
                }).join('');
            }
            API_AddBotMessage(wrapLinesWithPTags(data.content[0].text));

        })
        .catch(error => console.log(error));
}
