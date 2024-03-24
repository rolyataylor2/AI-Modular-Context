
API_URL = 'http://127.0.0.1/Chat/Completions';
API_Object = {
    model: "claude-3-haiku-20240307",
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

function API_RemoveLastMessage() {
    API_AdditionalMessages.pop()
    ChatUpdate();
}
function API_AddUserMessage(message) {
    const messageLength = API_AdditionalMessages.length - 1;
    if (messageLength > -1 && API_AdditionalMessages[messageLength].role === 'user') {
        // Append message
        API_AdditionalMessages[messageLength].content = message;
        ChatUpdate()
        return;
    }
    API_AdditionalMessages.push({
        'role': 'user',
        'content': message
    });
    ChatUpdate()
}
function API_AddBotMessage(message) {
    API_AdditionalMessages.push({
        'role': 'assistant',
        'content': message
    });
    ChatUpdate();
}

function estimateTokens(messages, systemPrompt = "") {
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
    });
    simpleTokenize(systemPrompt);
    return totalTokenCount;
}

function API_FetchMessage() {
    // Compile The API Object
    var data = { ...API_Object };
    data.messages = [...API_Object.messages, ...API_AdditionalMessages];
    data.system = ContextCompile();
    data.api_key = API_Key();
    data.api_key_save = API_Key_Save();

    // Estimate Tokens
    var estimatedTokens = estimateTokens(data.messages, data.system);
    if (!confirm(`This will use more than ${estimatedTokens} tokens, Are you sure?`))
        return;

    // Approved
    document.getElementById('Chat').classList.add('loading');
    return fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById('Chat').classList.remove('loading');
            return data.content[0].text;
        })
        .catch(error => {
            document.getElementById('Chat').classList.remove('loading');
            console.log(error);
        });
}
