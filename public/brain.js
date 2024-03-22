function saveBlock(blockElement) {
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
                                if (input.name == 'active' && input.checked)
                                    blockElement.classList.add('active');
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


function updateBlock(blockElement) {
    var dynamicContext = blockElement.querySelector('textarea[name="dynamic"]');
    var updateScript = blockElement.querySelector('textarea[name="update"]');

    API_AddUserMessage(updateScript.value);
    var fetching = API_FetchMessage();
    API_RemoveLastMessage();
    fetching.then(updatedContext=>{
        dynamicContext.value = updatedContext;
    });
}

document.addEventListener("DOMContentLoaded", function () {
    for (var i = 0; i < 16; i++) {
        var div = document.createElement('div');
        div.innerHTML = `
            <div class="expand" onclick="this.parentElement.classList.toggle('expanded')">
                <label for="">&#10530;</label>
            </div>
            <div class="activate">
                <label for="">Active</label>
                <input name="active" type="checkbox" onclick="this.parentElement.parentElement.classList.toggle('active')">
            </div>
            <div class="full small">
                <label for="">Name</label>
                <input name="name" type="text" placeholder="Name">
            </div>
            
            <div class="full">
                <label for="">Description</label>
                <input name="desc" type="text" placeholder="What is this?">
            </div>
            <div class="full">
                <label for="">Static Context</label>
                <textarea name="static"></textarea>
            </div>
            <div class="full">
                <label for="">Dynamic Context</label>
                <textarea name="dynamic"></textarea>
            </div>
            <div class="full">
                <label for="">Update Context</label>
                <textarea name="update"></textarea>
            </div>
            <div class="full">
                <div class="button" onclick="saveBlock(this.parentElement.parentElement)">Save Block</div>
                <div class="button" onclick="loadBlock(this.parentElement.parentElement)">Load Block</div>
                <div class="button" onclick="updateBlock(this.parentElement.parentElement)">Update Block</div>
            </div>
        `;
        document.getElementById('BrainGrid').appendChild(div);
    }
});