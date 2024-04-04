function saveAllBlocks() {
    var data = {
        'name': document.getElementById('BrainName').value || 'Untitled',
        'autoupdate': document.getElementById('AutoUpdateBrain').checked,
        'blocks':[]
    }
    if (data.name == 'Untitled') return alert('Please name your agent first...');
    var blocks = document.querySelectorAll('#BrainGrid > div');
    blocks.forEach(element=>{
        data.blocks.push(saveBlock(element, false))
    })

     // Create a Blob object representing the JSON data
     var json = JSON.stringify(data, null, 2); 
     var blob = new Blob([json], { type: 'application/json' });

     // Create an anchor element and use the Blob URL as the href
     var url = URL.createObjectURL(blob);
     var a = document.createElement('a');
     a.href = url;
     a.download = `${data.name} - Entire Brain.json`; // Set the file name for the download
 
     // Append the anchor to the body, trigger the download, and remove the anchor
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
 
     // Revoke the Blob URL to free up resources
     URL.revokeObjectURL(url);
}

// Function to trigger file input
function loadAllBlocks() {
    const fileInput = document.getElementById('fileInput');
    fileInput.click(); // Programmatically open the file dialog

    // Once a file is selected, process it
    fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (file) {
            // Create a FileReader to read the file
            const reader = new FileReader();

            // Setup the onload event to process the file once read
            reader.onload = (e) => {
                const content = e.target.result;

                // Parse the JSON content
                try {
                    const jsonData = JSON.parse(content);
                    // Assign Name
                    document.getElementById('BrainName').value = jsonData.name;
                    document.getElementById('AutoUpdateBrain').checked = jsonData.autoupdate || false;
                    // Block By Block
                    Array.from(document.querySelectorAll('#BrainGrid > div')).reverse().forEach(blockElement=>{
                        // Take Data From The File
                        var blockData = jsonData.blocks.pop();
                        console.log(blockData)
                        // Iterate all the data in the block data
                        Object.keys(blockData).forEach(key => {
                            const input = blockElement.querySelector(`[name="${key}"]`);
                            if (input) {
                                if (input.type === 'checkbox') {
                                    input.checked = blockData[key]; // Update checkboxes
                                    if (input.name == 'active') {
                                        if (input.checked)
                                            blockElement.classList.add('active');
                                        else blockElement.classList.remove('active');
                                    }
                                } else {
                                    input.value = blockData[key]; // Update other inputs
                                }
                            }
                        });
                    });
                    
                    fileInput.value = ''; 
                } catch (error) {
                    fileInput.value = ''; 
                    console.error('Error parsing JSON', error);
                }
            };

            // Read the file as text
            reader.readAsText(file);
        }
    };
}

function saveBlock(blockElement, saveFile=true) {
    // Initialize an empty object to store input values
    var data = {};

    // Find all input and textarea elements within the parent element
    var inputs = blockElement.querySelectorAll('input, textarea');

    // Iterate over each input/textarea to collect their names and values
    inputs.forEach(function (input) {
        // Use the input's name as the key and its value (or checked state) as the value
        if (input.type === 'checkbox') {
            data[input.name] = input.checked;
        } else {
            data[input.name] = input.value;
        }
    });

    // Convert the data object to a JSON string
    var json = JSON.stringify(data, null, 2); // Pretty print the JSON
    if (saveFile == false) return data;
    // Create a Blob object representing the JSON data
    var blob = new Blob([json], { type: 'application/json' });

    // Create an anchor element and use the Blob URL as the href
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var projectName = document.getElementById('BrainName').value || 'Untitled';
    a.href = url;
    a.download = `${projectName} - Lobe (${data['name']}).json`; // Set the file name for the download

    // Append the anchor to the body, trigger the download, and remove the anchor
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Revoke the Blob URL to free up resources
    URL.revokeObjectURL(url);
}

// Function to trigger file input
function loadBlock(blockElement) {
    const fileInput = document.getElementById('fileInput');
    fileInput.click(); // Programmatically open the file dialog

    // Once a file is selected, process it
    fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (file) {
            // Create a FileReader to read the file
            const reader = new FileReader();

            // Setup the onload event to process the file once read
            reader.onload = (e) => {
                const content = e.target.result;

                // Parse the JSON content
                try {
                    const jsonData = JSON.parse(content);

                    // Iterate over the jsonData and update inputs within the block
                    Object.keys(jsonData).forEach(key => {
                        const input = blockElement.querySelector(`[name="${key}"]`);
                        if (input) {
                            if (input.type === 'checkbox') {
                                input.checked = jsonData[key]; // Update checkboxes
                                if (input.name == 'active') {
                                    if (input.checked)
                                        blockElement.classList.add('active');
                                    else blockElement.classList.remove('active');
                                }
                            } else {
                                input.value = jsonData[key]; // Update other inputs
                            }
                        }
                    });
                    fileInput.value = ''; 
                } catch (error) {
                    fileInput.value = ''; 
                    console.error('Error parsing JSON', error);
                }
            };

            // Read the file as text
            reader.readAsText(file);
        }
    };
}



function loadUrlBlock(blockElement) {

}
function ChatCompile() {
    var compiledChat = '<chatlog>You:Hello\n';
    API_AdditionalMessages.forEach(entry=>{
        if (entry.role === 'assistant') compiledChat += `You:${entry.content}\n`;
        else compiledChat += `Them:${entry.content}\n`;
    })
    compiledChat += '</chatlog>';
    return compiledChat;
}
function updateCompileBrain() {
    var brainXML = '<Brain>\n';
    var blocks = GetBrainGrid();
    blocks.forEach(block => {
        if (block.active == true) {
            brainXML += `<lobe name="${block.name}" description="${block.description}">\n`;
            brainXML += `<dynamic>${block.dynamic}</dynamic>\n`;
            brainXML += `</lobe>\n`;
        }
    })
    brainXML += '</Brain>';
    return brainXML;
}
function updateBlock(blockElement) {
    console.log('Updating Lobe: ' + blockElement.querySelector('input[name="name"]').value);
    var activeElement = blockElement.querySelector('input[name="active"]');
    if (activeElement.checked == false ) return alert('This block is not active.');

    var updateScriptElement = blockElement.querySelector('textarea[name="update"]');
    var dynamicContextElement = blockElement.querySelector('textarea[name="dynamic"]');
    var updateScript = updateScriptElement.value;

    updateScript = updateScript.replace('{{{{brain}}}}', updateCompileBrain());
    updateScript = updateScript.replace('{{{{chatlog}}}}', ChatCompile());

    // Compile The API Object
    var data = { ...API_Object };
    data.messages = [{
        'role':'user',
        'content':updateScript
    }];
    data.system = ' ';
    data.api_key = API_Key();
    data.api_key_save = API_Key_Save();

    
    // Approved
    blockElement.classList.add('loading');
    return fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            blockElement.classList.remove('loading');
            dynamicContextElement.value = data.content[0].text;
            return data.content[0].text;
        })
        .catch(error => {
            blockElement.classList.remove('loading');
            console.log(error);
        });
}

async function updateAllBlocks(override=false) {
    if (override == false && !document.getElementById('AutoUpdateBrain').checked) return console.log('Auto Update Brain Is Off');
    if (document.getElementById('SmartUpdateBrain').checked) {
        // Run a prompt to check all the blocks if they need to be updated
        // Compile The API Object
        var data = { ...API_Object };
        data.messages = [{
            'role':'user',
            'content':`Based on the chat and your current brain, think step by step which lobes (without naming them) need to be updated that you feel need to be updated at this moment. `
            + `Then list ALL of the complete names of the lobes that you feel need to be updated. Any lobe not listed WILL NOT BE UPDATED! `
            + `ANY complete lobe names appearing in your output will be updated. Try to updated the minimum number of lobes, but remember vital information. `
            + `All Lobes will use the chat and the brain to update themselves. `
            + `Updating them saves progress and information from the chat, All information in the chat is temporary and not guaranteed to be available later.`
            + `Only update lobes that need updating, meaning if there is information in the chat or something needs to be saved or elaborated on.`
        }];
        data.system = ContextCompile() + `<chatlog>${ChatCompile()}</chatlog>`;
        data.api_key = API_Key();
        data.api_key_save = API_Key_Save();

        
        // Approved
        document.getElementById('Brain').classList.add('loading');
        return fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(async function(data) {
                document.getElementById('Brain').classList.remove('loading');
                var lobesText = data.content[0].text;
                console.log(lobesText);
                
                var blocks = document.querySelectorAll('#BrainGrid > div.active');
                var blocks = Array.from(document.querySelectorAll('#BrainGrid > div.active'));
                    blocks = blocks.filter(function(block) {
                        var name = block.querySelector('input[name="name"]').value;
                        return lobesText.includes(name);
                    });
                for(var i=0;i<blocks.length;i++) {
                    await updateBlock(blocks[i]);
                }
                
            })
            .catch(error => {
                document.getElementById('Brain').classList.remove('loading');
                console.log(error);
            });
    }
    // Not smart update
    var blocks = document.querySelectorAll('#BrainGrid > div.active');
    for(var i=0;i<blocks.length;i++) {
        await updateBlock(blocks[i]);
    }
}

async function refineBlock(blockElement) {
    // Confirm
    if (!confirm("This will take a few minutes and will use a lot of tokens both in Opus and Haiku. Are you sure?") ) return;

    // Define Post Data
    var blockName = blockElement.querySelector('input[name="name"]').value;
    var blockDescription = blockElement.querySelector('input[name="description"]').value;
    var blockTestCases = blockElement.querySelector('input[name="refine-test"]').value;
    var blockTestPrompts = blockElement.querySelector('input[name="refine-prompts"]').value;
    var blockTestReplace = blockElement.querySelector('input[name="refine-replace"]').checked;
    var data =  {
        apiKey: API_Key(),
        
        description: `Given just the current chatlog and an XML representing a snapshot of the brain of the entity, `
        + `Write a prompt that will extract and update the content of the brain lobe: <lobe name='${blockName}' description='${blockDescription}'><dynamic>[updated content]</dynamic><static>[ignore this]</static></lobe>; `
        + `The 'name' and 'description' attributes are a guide for what to extract and update, the entity is referred to as 'You'; `
        + `The prompt should represent the lobe of the brain (No name or identity of its own) with all the skills necessary to update itself; `
        + `The final result should be the content of only the <dynamic></dynamic> tag within the lobe, nothing else; `
        + ( blockTestReplace ? `The prompt must discard the old content of the tag; `:`The prompt must be sure to preserve and update what is already in the tag; `),
        inputVariables: [
            {
              "variable": "chatlog",
              "description": "The current chat the entity and user are participating in."
            },
            {
              "variable": "brain",
              "description": "XML tag of the entirety of the entity's brain, the brain contains various lobe tags. <brain><lobe><dynamic></dynamic></lobe></brain>"
            }
        ],
        numTestCases: parseInt(blockTestCases),
        numberOfPrompts: parseInt(blockTestPrompts)
    };
    console.log(data)

    document.getElementById('Brain').classList.add('loading');
    // Send
    fetch('/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(response => response.json())
    .then(result => {
        document.getElementById('Brain').classList.remove('loading');
        var updateScript = blockElement.querySelector('textarea[name="update"]');
        updateScript.value = result.table;
    }).catch(error=>{
        document.getElementById('Brain').classList.remove('loading');
    });
}

document.addEventListener("DOMContentLoaded", function () {
    for (var i = 0; i < 16; i++) {
        var div = document.createElement('div');
        div.onclick = function (event) {
            this.classList.add('expanded');
        }.bind(div);
        div.innerHTML = `
            <div class="full small">
                <label for="">Name</label>
                <input name="name" autocomplete="off" type="text" placeholder="Name">
            </div>
            <div class="full">
                <label for="">Description</label>
                <div>
                    <input name="description" type="text" placeholder="What is this?">
                    <sub>Refer to LCE as "you" ( Example: This contains your feelings about ... )</sub>
                </div>
            </div>
            <div class="full">
                <label for="">Active</label>
                <input name="active" type="checkbox" onclick="this.parentElement.parentElement.classList.toggle('active')">
            </div>
            <div class="full">
                <label for="">
                    Update Script<br/>
                    <div class="button" onclick="refineBlock(this.parentElement.parentElement)">Autofill</div>
                </label>
                <div>
                    <textarea name="update"></textarea>
                    <sub>
                        <b>Autofill Settings:</b>
                        Cases: <input class="tiny" type="text" name="refine-test" value="3"/>
                        Prompts: <input class="tiny" type="text" name="refine-prompts" value="2"/>
                        Replace: <input class="tiny" type="checkbox" name="refine-replace"/>
                    </sub>
                    <sub>Be sure to include: {{{{brain}}}} and {{{{chatlog}}}}</sub>
                </div>
            </div>
            <div class="full">
                <label for="">
                    Dynamic Context
                    <div class="button" onclick="updateBlock(this.parentElement.parentElement)">Update</div>
                </label>
                <div>
                    <textarea name="dynamic"></textarea>
                    <sub>* Updating this will run ( Haiku + Update Script ) to fill in this section</sub>
                </div>
            </div>

            <div class="full">
                <label for="">Static Context</label>
                <div>
                    <textarea name="static"></textarea>
                    <sub>* The LCE will not have perfect recall of static lobe context
                </div>
            </div>

            <div class="full">
                <label>Save/Load Block</label>
                <div>
                    <div class="button" onclick="saveBlock(this.parentElement.parentElement.parentElement)">Save</div>
                    <div class="button" onclick="loadBlock(this.parentElement.parentElement.parentElement)">Load</div>
                </div>
            </div>
            <div class="full" onclick="this.parentElement.classList.remove('expanded'); event.stopPropagation();">
                <label for=""></label>
                <div class="button">Close</div>
            </div>
            
        `;
        document.getElementById('BrainGrid').appendChild(div);
    }
});