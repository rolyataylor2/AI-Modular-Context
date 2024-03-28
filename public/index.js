
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



function API_FetchMessage() {
    // Compile The API Object
    var data = { ...API_Object };
    data.messages = [...API_Object.messages, ...API_AdditionalMessages];
    data.system = ContextCompile();
    data.api_key = API_Key();
    data.api_key_save = API_Key_Save();

    // Estimate Tokens
    var estimatedTokens = data.system.length/4;
    estimatedTokens += data.messages.reduce(function(accumulator, currentObject) {
        return accumulator + currentObject.content + " "; // Add a space or any other delimiter as needed
      }, "").length/4;
    var smartUpdateWarning = (document.getElementById('SmartUpdateBrain').checked ? `Smart Update is on which could reduce token usage.\n` : 'Smart Update is off..\n');
    var autoUpdateWarning = (document.getElementById('AutoUpdateBrain').checked ? `Brain Auto Update could use: ${estimatedTokens * 16} tokens\n` +  smartUpdateWarning : 'Brain Auto Update is off..\n')
    if (!confirm(`This will use roughly ${estimatedTokens} input tokens\n`
                + `Using the model: ${data.model}\n`
                + autoUpdateWarning
                + `\nAre you sure you want to proceed?`))
        throw 'User cancelled request!';

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
