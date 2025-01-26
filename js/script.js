const chatInput = document.querySelector("#chat-input");
const sendButton = document.querySelector("#send-btn");
const chatContainer = document.querySelector(".chat-container");
const themeButton = document.querySelector("#theme-btn");
const deleteButton = document.querySelector("#delete-btn");

let userText = null;
let loading = false;
const API_KEY = "chat gpt api key here"; // Paste your API key here
let messages = [];
let ignoreCredits = false;
let img_generated = false;
let img_url = "";
let conversation_thread_id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
let index = 1;
let gURIs = [];

const createChatElement = (content, className) => {
    // Create new div and apply chat, specified class and set html content of div
    const chatDiv = document.createElement("div");
    chatDiv.classList.add("chat", className);
    if (rtl) {
        chatDiv.setAttribute('dir', 'rtl');
    }
    chatDiv.innerHTML = content;
    return chatDiv; // Return the created chat div
}

const getChatResponse = async (incomingChatDiv) => {
    const pElement = document.createElement("p");
    pElement.classList.add('text-sm');
    pElement.style.fontFamily = `${font_face}, sans-serif`;
    if (font_color.length > 0) {
        pElement.style.color = `${font_color}`;
    }
    if (rtl) {
        pElement.setAttribute('dir', 'rtl');
    }
    let chatResponse = "";
    var noError = false;

    var imageFile = document.getElementById("filePicker").files[0];
    var fileSizeValid = !imageFile || (imageFile.size <= 100 * 1024 * 1024); // Check if file size is <= 12MB or if imageFile is not present

    if ((disableCredits || parseInt(document.getElementById('credits_user').innerHTML) > 0 || ignoreCredits) && fileSizeValid) {
        if (!disableCredits) {
            var generationsElement = document.getElementById('credits_user');
            var currentValue = parseInt(generationsElement.innerText);
            if (!ignoreCredits) {
                generationsElement.innerText = currentValue - 1;
            }
        }

        try {

            unlinkFilePicker()
            // Create a new FormData object
            var formData = new FormData();

            // Append JSON data
            formData.append('userText', userText);
            formData.append('botId', botId);
            formData.append('thread_id', thread_id);
            formData.append('messages', JSON.stringify(messages));
            formData.append('conversation_thread_id', conversation_thread_id);
            formData.append('index', index);
            formData.append('gURIs', JSON.stringify(gURIs));

            // Append the image file
            formData.append('uploadfile', imageFile);

            const response = await fetch('/getResponseImage', {
                method: 'POST',
                body: formData // Set the body as FormData
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let result = '';
            let isStreamed = false;
            let data;
            incomingChatDiv.querySelector(".typing-animation").remove();

            let debounceTimer;
            outerLoop: while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n'); // Split by newline to handle multiple chunks

                for (const line of lines) {
                    if (line.trim()) { // Ignore empty lines
                        const parsedChunk = JSON.parse(line);
                        //console.log(parsedChunk);
                        const streamed = parsedChunk.streamed;
                        data = parsedChunk;

                        if (!streamed) {
                            break outerLoop;
                        }

                        const content = parsedChunk.message;
                        result += content;
                        // Optionally, update the UI with partial results
                        //console.log(result);
                        data.message = result;

                        clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(() => {
                            pElement.innerHTML = formatText2(result);
                            incomingChatDiv.querySelector(".chat-details").appendChild(pElement);
                            // Scroll to the bottom of the chat container
                            // const chatContainer = document.querySelector(".chat-container");
                            // chatContainer.scrollTop = chatContainer.scrollHeight;
                        }, 5); // Adjust the debounce delay as needed
                    }
                }
            }

            console.log(data);
            // if (!response.ok) {
            //
            // }
            console.log(data.message);
            chatResponse = data.message;

            if (data.aboutResponse) {
                noError = true;
            }

            if (data.img_generated) {
                img_generated = true;
                img_url = data.img_generated;
            }

            if (data.thread_id) {
                thread_id = data.thread_id;
            }

            if (data.file_name != null && data.mimetype != null) {
                gURIs.push([data.file_name, data.mimetype]);
            }

            if (chatResponse == "error_92930") {
                noError = true;
                chatResponse = "Something went wrong with this request, your credit was not used! Please try again or contact support if problem persists.";
                increaseCredits();
            } else if (chatResponse == "error_99530") {
                noError = true;
                chatResponse = "You have exhausted your credits for this app. Please obtain more credits to continue using the app.";
                increaseCredits();
            } else if (chatResponse == "error_29949") {
                noError = true;
                chatResponse = "This request is against the rules of the platform and could not be completed.";
                increaseCredits();
            } else if (chatResponse == "error_92910") {
                noError = true;
                chatResponse = "Please add your OpenAI key to continue using the bot.";
                increaseCredits();
                document.getElementById('chatgptkey-modal').classList.remove('hidden');
            } else if (chatResponse == "error_92103") {
                noError = true;
                chatResponse = "This app has been made inactive by the creator. Please request them to reactivate it.";
                increaseCredits();
            } else if (chatResponse == "error_92933") {
                noError = true;
                chatResponse = "You don't have access to this app. Please request the creator for access.";
                increaseCredits();
            } else if (chatResponse == "error_92003") {
                noError = true;
                chatResponse = "Please upgrade your plan to reactivate this app. This message is only visible to you.";
                increaseCredits();
            } else if (chatResponse == "error_93000") {
                noError = true;
                chatResponse = "File format is not supported. Please use another file.";
                increaseCredits();
            } else {
                if (!isDiffusion) {
                    if (img_generated && data.revised_prompt) {
                        let chatResponse1 = chatResponse + "\n\n(image output here matching this detailed prompt: " + data.revised_prompt + ")";
                        messages.unshift(userText, chatResponse1);
                    } else {
                        messages.unshift(userText, chatResponse);
                    }
                }
            }

        } catch (err) {
            noError = true;
            chatResponse = "Something went wrong with this request. Please try again or contact support if problem persists";
            increaseCredits();
        }

    } else if (!fileSizeValid) {
        noError = true;
        chatResponse = "Please keep the file size under 100 MB.";
    } else {
        noError = true;
        chatResponse = "You have exhausted your credits for this app. Please get more credits to continue using the app.";
    }

    if (messages.length >= 20) {
        messages.splice(18, 2);  // Removes 28th and 29th elements
    }

    if (gURIs.length > 6) {
        gURIs.splice(0, gURIs.length - 6);  // Removes the oldest entries to keep the length at 6
    }

    // Send POST request to API, get response and set the reponse as paragraph element text
    /*
    try {
        const response = await (await fetch(API_URL, requestOptions)).json();
        pElement.textContent = response.choices[0].text.trim();
    } catch (error) { // Add error class to the paragraph element and set error text
        pElement.classList.add("error");
        pElement.textContent = "Oops! Something went wrong while retrieving the response. Please try again.";
    }
    */
    setTimeout(() => {
        if (isDalle & !noError) {
            pElement.innerHTML = formatText3(chatResponse, size);
        } else if (isDiffusion && !noError) {
            pElement.innerHTML = formatText4(chatResponse);
        } else {
            pElement.innerHTML = formatText2(chatResponse);
            index += 1;
        }

        if (img_generated) {
            pElement.innerHTML += formatText5(img_url);
            img_generated = false;
        }

        // Remove the typing animation, append the paragraph element and save the chats to local storage
        const typingAnimation = incomingChatDiv.querySelector(".typing-animation");
        if (typingAnimation) {
            typingAnimation.remove();
        }
        incomingChatDiv.querySelector(".chat-details").appendChild(pElement);
        loading = false;
        ignoreCredits = false;
        // const chatContainer = document.querySelector(".chat-container");
        // chatContainer.scrollTop = chatContainer.scrollHeight;
        // storing chats on local system
        //localStorage.setItem("all-chats", chatContainer.innerHTML);
        // chatContainer.scrollTo(0, chatContainer.scrollHeight);
    }, 100);
}

const copyResponse = (copyBtn) => {
    // Copy the text content of the response to the clipboard
    const reponseTextElement = copyBtn.parentElement.querySelector("p");
    navigator.clipboard.writeText(reponseTextElement.textContent);
    copyBtn.textContent = "done";
    setTimeout(() => copyBtn.textContent = "content_copy", 1000);
}

const showTypingAnimation = () => {
    // Display the typing animation and call the getChatResponse function
    const html = `<div class="flex w-full items-start justify-between max-w-2xl">
                    <div class="chat-details flex items-center">
                        <img src="${imgURL}" alt="chatbot-img">
                        <div class="typing-animation">
                            <div class="typing-dot" style="--delay: 0.2s"></div>
                            <div class="typing-dot" style="--delay: 0.3s"></div>
                            <div class="typing-dot" style="--delay: 0.4s"></div>
                        </div>
                    </div>
                    <span onclick="copyResponse(this)" class="material-symbols-rounded copy-content">content_copy</span>
                </div>`;
    // Create an incoming chat div with typing animation and append it to chat container
    const incomingChatDiv = createChatElement(html, "incoming");
    if (bot_attr) {
        incomingChatDiv.style.background = "none";
        incomingChatDiv.style.backgroundColor = "rgba(255, 255, 255, 0.4)";
        // incomingChatDiv.style.fontWeight = "bold";
    }
    chatContainer.appendChild(incomingChatDiv);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    getChatResponse(incomingChatDiv);
}

const starterSubmit = (msg) => {
    chatInput.value = msg;
    handleOutgoingChat();

    if (conv1) {
        document.getElementById('convo_btn1').classList.add('hidden');
    }

    if (conv2) {
        document.getElementById('convo_btn2').classList.add('hidden');
    }
};

const handleOutgoingChat = () => {

    if (loading) {
        return;
    }

    let linkImgHtml = ''
    if (base64String != null) {
        linkImgHtml += `
          <div class="w-full pt-2 pb-2" style="max-width: 340px;">
              <img src="${base64String}" class="w-full h-full" style="width: 100%; height: 100%;" alt="" />
          </div>
      `;
    } else if (hasFile) {

        linkImgHtml += `
          <div class="w-full pt-2 pb-4" style="max-width: 50px;">
              <img src="img/file-icon.svg" class="w-full h-full" style="width: 100%; height: 100%;" alt="" />
              <span class="text-sm" style="white-space: nowrap;">${file_name}</span>
          </div>
      `;

    }

    userText = chatInput.value.trim(); // Get chatInput value and remove extra spaces
    if (!userText) return; // If chatInput is empty return from here

    loading = true;
    document.getElementById('default-container').style.display = "none";

    // Clear the input field and reset its height
    chatInput.value = "";
    chatInput.style.height = `${initialInputHeight}px`;

    const escapedUserText = userText.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const html = `<div class="flex w-full items-start justify-between max-w-2xl">
                    <div class="chat-details flex items-center">
                        <img src="${user_img}" alt="user-img">
                        <div>
                          <div class="ps-2">
                            ${linkImgHtml}
                          </div>
                          <p class="text-sm dark:text-gray-700" style="font-family: ${font_face}, cursive; color: ${font_color};">${escapedUserText}</p>
                        </div>
                    </div>
                </div>`;

    // Create an outgoing chat div with user's message and append it to chat container
    const outgoingChatDiv = createChatElement(html, "outgoing");
    chatContainer.querySelector(".default-text")?.remove();
    if (bot_attr) {
        outgoingChatDiv.style.background = "none";
        outgoingChatDiv.style.backgroundColor = "rgba(255, 255, 255, 0.16)";
        // outgoingChatDiv.style.fontWeight = "bold";
    }
    chatContainer.appendChild(outgoingChatDiv);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
    setTimeout(showTypingAnimation, 500);
    if (!disablePayments && !hasSubscription) {
        document.getElementById("buyButton").classList.remove('hidden');
    }
    //document.getElementById('buttonFeedback').classList.add('hidden');
    if (share_chat_btn) {
        document.getElementById('buttonShareChat').classList.remove('hidden');
    }
}

deleteButton.addEventListener("click", () => {
    // Remove the chats
    if (confirm("Are you sure you want to delete all the chats?")) {

        [...document.getElementsByClassName('chat')].forEach(el => {
            el.remove();
            // Do something with each element
        })
        document.getElementById('default-container').style.display = "flex";
        document.getElementById("buyButton").classList.add('hidden');
        document.getElementById('buttonFeedback').classList.remove('hidden');
        document.getElementById('buttonShareChat').classList.add('hidden');

        if (conv1) {
            document.getElementById('convo_btn1').classList.remove('hidden');
        }

        if (conv2) {
            document.getElementById('convo_btn2').classList.remove('hidden');
        }

        thread_id = "-1";
        messages = [];
        gURIs = [];
        conversation_thread_id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
});


const initialInputHeight = chatInput.scrollHeight;

chatInput.addEventListener("input", () => {
    // Adjust the height of the input field dynamically based on its content
    chatInput.style.height = `${initialInputHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});

chatInput.addEventListener("keydown", (e) => {
    // If the Enter key is pressed without Shift and the window width is larger
    // than 800 pixels, handle the outgoing chat
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
        e.preventDefault();
        handleOutgoingChat();
    }
});

sendButton.addEventListener("click", handleOutgoingChat);

document.getElementById('chatgptkey-modal-button').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value;

    if (apiKey.trim() == "") { return; }

    document.getElementById('chatgptkey-modal-button').disabled = true;
    document.getElementById('textkey').innerHTML = "Validating access...";
    // document.getElementById('chatgptkey-modal').style.display = "none";
    try {
        const keyResponse = await fetch('/updateOpenAIKey', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ apiKey, botId }),
        });

        if (!keyResponse.ok) {
            throw new Error('Network response was not ok.');
        }

        const data = await keyResponse.json();

        if (data.message !== "success") {
            document.getElementById('textkey').innerHTML = "Access code provided is invalid. Please request the app creator for the code. ";
            return;
        }

        // Handle success here, e.g., close modal or show success message
        document.getElementById('textkey').innerHTML = "Validation Successful.";

        document.getElementById('chatgptkey-modal').classList.add('hidden');

    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        document.getElementById('textkey').innerHTML = "An error occurred. Please try again.";
    } finally {
        // Re-enable the button or perform other cleanup actions
        document.getElementById('chatgptkey-modal-button').disabled = false;
    }
});

document.getElementById('close-button').addEventListener('click', function () {
    document.getElementById('chatgptkey-modal').classList.add('hidden');
});

function chatgptapimodalopen() {
    document.getElementById('chatgptkey-modal').classList.remove('hidden');
}

function moreaboutthisbot() {
    chatInput.value = "Tell me more about this bot";
    ignoreCredits = true;
    handleOutgoingChat();
}

function convertToHTMLText(text) {
    var converter = new showdown.Converter();
    var htmlText = converter.makeHtml(text);

    // Replace <p> tags with plain text
    htmlText = htmlText.replace(/<p>/g, '');

    // Replace </p> tags with <br>
    htmlText = htmlText.replace(/<\/p>/g, '<br>');
    // htmlText = htmlText.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    return htmlText;
}

function formatText2(text) {
    const escapedUserText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const cleanedText = escapedUserText.replace(/【.*?†*】/g, '');
    const linkText = cleanedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a style='text-decoration: underline;' target='_blank' href='$2'>$1</a>");
    const boldText = linkText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    const codeText = boldText.replace(/```(\w+)\s*([\s\S]*?)```/g, '<code>$2</code>');
    const codeText1 = codeText.replace(/`([\s\S]*?)`/g, "<code style='background-color: lightgray; padding: 2px;font-family: monospace;'>$1</code>");
    const headingText = codeText1.replace(/^###\s+(.*?)$/gm, '<b>$1</b>');
    const headingText1 = headingText.replace(/^##\s+(.*?)$/gm, '<b>$1</b>');
    const headingText2 = headingText1.replace(/^####\s+(.*?)$/gm, '<b>$1</b>');
    const mathText = headingText2.replace(/\*\*\*(.*?)\*\*\*/g, '<div class="math-equation">$$$1$$</div>');
    return markdownToHtmlTable(mathText);
}

function markdownToHtmlTable(markdownText) {
    const lines = markdownText.split('\n');
    let isTable = false;
    let htmlOutput = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('|') && line.endsWith('|')) {
            if (!isTable) {
                isTable = true;
                htmlOutput += '<table>\n';
            }

            if (line.includes('|---')) {
                // Skip the separator line
                continue;
            }

            htmlOutput += '  <tr>\n';
            const cells = line.split('|');
            cells.forEach(cell => {
                if (cell.trim() !== '') {
                    htmlOutput += '    <td>' + cell.trim() + '</td>\n';
                }
            });
            htmlOutput += '  </tr>\n';
        } else {
            if (isTable) {
                isTable = false;
                htmlOutput += '</table>\n';
            }
            htmlOutput += line + '\n';
        }
    }

    if (isTable) {
        htmlOutput += '</table>\n';
    }

    return htmlOutput;
}

const detectAsciiArt = (text) => {
    const lines = text.split('\n');
    let insideAsciiArt = false;
    let result = [];
    let asciiArtBlock = [];

    // const asciiRegex = /^[#\s\*|\/\\-]+$/; // Regex to detect possible ASCII art lines
    const asciiRegex = /^[#\s\*|\/\\-⣿⣶⢿⡇⠛⠿⣤⣀]+$/;


    lines.forEach(line => {
        if (asciiRegex.test(line.trim())) {
            // If line matches ASCII art pattern
            insideAsciiArt = true;
            asciiArtBlock.push(line);
        } else {
            // If it's normal text
            if (insideAsciiArt) {
                // Wrap ASCII art block inside <pre> tag
                result.push(`<pre>${asciiArtBlock.join('\n')}</pre>`);
                asciiArtBlock = [];
            }
            insideAsciiArt = false;
            result.push(line); // Normal text
        }
    });

    // where ASCII art is at the end
    if (asciiArtBlock.length) {
        result.push(`<pre>${asciiArtBlock.join('\n')}</pre>`);
    }

    return result.join('\n');
};

function escapeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

function formatText(text) {
    // Replace ** ** with <b></b>
    const boldText = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    // Replace ``` ``` with <code></code>
    const codeText = boldText.replace(/```([\s\S]*?)```/g, '<code><xmp>$1</xmp></code>');
    // const codeText = boldText.replace(/```([\s\S]*?)```/g, `<textarea class="block p-2 w-full mt-1 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" style="color: crimson; font-family: monospace;" readonly>$1</textarea>`);

    console.log(codeText)
    return codeText;
}

function formatText3(text, size) {

    const dimensions = size.split('x');
    const width = dimensions[0];
    const height = dimensions[1];

    const htmlTemplate = `Here is your requested image:
    <img src="${text}" style="width:100%; height:auto;" alt="Requested Image">
Remember that this bot does not save context, and each request is treated as a new one.
  `;

    return htmlTemplate;
}

function formatText4(text) {

    const htmlTemplate = `Here is your requested image:<br>
    <img src="data:image/png;base64, ${text}" style="width:100%; height:auto;" alt="Requested Image"><br>
Remember that this bot does not save context, and each request is treated as a new one.
  `;

    return htmlTemplate;
}

function showModal(url) {
    const modalFeedback = document.getElementById('modalImage');
    const modalImage = document.getElementById('modalContent');

    modalImage.src = url; // Update the image source in the modal
    modalFeedback.classList.remove('hidden'); // Make the modal visible
}

function formatText5(url) {

    const htmlTemplate = `<img src="${url}" style="width:60%; height:auto; cursor: pointer;" alt="Requested Image" onclick="showModal('${url}')">`;

    return htmlTemplate;
}

function increaseCredits() {
    if (!disableCredits) {
        var generationsElement = document.getElementById('credits_user');
        var currentValue = parseInt(generationsElement.innerText);
        generationsElement.innerText = currentValue + 1;
    }
}


// // convert img to base64
// const fileInput = document.querySelector('#filePicker');
// const customFileButton = document.querySelector('#customFileButton');
let base64String = null
let hasFile = false
let file_name = ""
// customFileButton.addEventListener('click', () => {
//     fileInput.click();
// });

// file upload option
// File Upload
const filePickerInput = document.querySelector('#filePicker');
const filePickerButton = document.querySelector('#attachment-btn');
let uploadedFilePicker = null;

filePickerButton.addEventListener('click', () => {
    filePickerInput.click();
});

filePickerInput.addEventListener('change', (e) => {
    let file = e.target.files[0];
    let reader = new FileReader();

    if (file.type.startsWith('image/')) {

        reader.onloadend = () => {
            // use a regex to remove data url part
            base64String = reader.result;
            document.getElementsByClassName('file-placeholder')[0].innerHTML =
                `
              <div class="link-img-wrp relative pt-2 ps-2 inline-block">
                  <div style="width: 80px; height: 80px; padding: 7px;">
                      <button type='button' onclick="unlinkFilePicker()" class="absolute top-1 right-0 cursor-pointer">
                          <svg width="22px" height="22px" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sketch="http://www.bohemiancoding.com/sketch/ns" fill="#ffffff" stroke="#ffffff">

                              <g id="SVGRepo_bgCarrier" stroke-width="0"/>

                              <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>

                              <g id="SVGRepo_iconCarrier"> <title>cross-circle</title> <desc>Created with Sketch Beta.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" sketch:type="MSPage"> <g id="Icon-Set-Filled" sketch:type="MSLayerGroup" transform="translate(-570.000000, -1089.000000)" fill="#666"> <path d="M591.657,1109.24 C592.048,1109.63 592.048,1110.27 591.657,1110.66 C591.267,1111.05 590.633,1111.05 590.242,1110.66 L586.006,1106.42 L581.74,1110.69 C581.346,1111.08 580.708,1111.08 580.314,1110.69 C579.921,1110.29 579.921,1109.65 580.314,1109.26 L584.58,1104.99 L580.344,1100.76 C579.953,1100.37 579.953,1099.73 580.344,1099.34 C580.733,1098.95 581.367,1098.95 581.758,1099.34 L585.994,1103.58 L590.292,1099.28 C590.686,1098.89 591.323,1098.89 591.717,1099.28 C592.11,1099.68 592.11,1100.31 591.717,1100.71 L587.42,1105.01 L591.657,1109.24 L591.657,1109.24 Z M586,1089 C577.163,1089 570,1096.16 570,1105 C570,1113.84 577.163,1121 586,1121 C594.837,1121 602,1113.84 602,1105 C602,1096.16 594.837,1089 586,1089 L586,1089 Z" id="cross-circle" sketch:type="MSShapeGroup"> </path> </g> </g> </g>

                          </svg>
                      </button>
                      <div class="rounded-xl overflow-hidden">
                          <img src="${base64String}" alt="" class="h-full w-full" />
                      </div>
                  </div>
              </div>
          `;
        };

        reader.readAsDataURL(file);

    } else {

        reader.onloadend = () => {

            uploadedFile = reader.result;
            let fileType = file.type;
            file_name = file.name;
            let fileDisplay = '';
            hasFile = true;
            base64String = null;

            fileDisplay = `
          <div class="link-file-wrp relative pt-2 ps-2 inline-block">
              <div style="width: auto; height: 80px; padding: 7px;">
              <button type='button' onclick="unlinkFilePicker()" class="absolute top-1 right-0 cursor-pointer">
              <svg width="22px" height="22px" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sketch="http://www.bohemiancoding.com/sketch/ns" fill="#ffffff" stroke="#ffffff">

                  <g id="SVGRepo_bgCarrier" stroke-width="0"/>

                  <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>

                  <g id="SVGRepo_iconCarrier"> <title>cross-circle</title> <desc>Created with Sketch Beta.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" sketch:type="MSPage"> <g id="Icon-Set-Filled" sketch:type="MSLayerGroup" transform="translate(-570.000000, -1089.000000)" fill="#666"> <path d="M591.657,1109.24 C592.048,1109.63 592.048,1110.27 591.657,1110.66 C591.267,1111.05 590.633,1111.05 590.242,1110.66 L586.006,1106.42 L581.74,1110.69 C581.346,1111.08 580.708,1111.08 580.314,1110.69 C579.921,1110.29 579.921,1109.65 580.314,1109.26 L584.58,1104.99 L580.344,1100.76 C579.953,1100.37 579.953,1099.73 580.344,1099.34 C580.733,1098.95 581.367,1098.95 581.758,1099.34 L585.994,1103.58 L590.292,1099.28 C590.686,1098.89 591.323,1098.89 591.717,1099.28 C592.11,1099.68 592.11,1100.31 591.717,1100.71 L587.42,1105.01 L591.657,1109.24 L591.657,1109.24 Z M586,1089 C577.163,1089 570,1096.16 570,1105 C570,1113.84 577.163,1121 586,1121 C594.837,1121 602,1113.84 602,1105 C602,1096.16 594.837,1089 586,1089 L586,1089 Z" id="cross-circle" sketch:type="MSShapeGroup"> </path> </g> </g> </g>
              </svg>
          </button>
                  <div class="rounded-xl overflow-hidden">
                      <div class="">
                        <img src="img/file-icon.svg" alt="CSV Icon" style="width: 55px;" class="" />
                        <div style="font-size: 12px;">${file.name}</div>
                      </div>
                  </div>
              </div>
          </div>
      `;

            document.getElementsByClassName('file-placeholder')[0].innerHTML = fileDisplay;

        };
        reader.readAsArrayBuffer(file);
    }

});

function unlinkFilePicker() {
    uploadedFile = null;
    base64String = null;
    hasFile = false;
    filePickerInput.value = null;
    document.getElementsByClassName('file-placeholder')[0].innerHTML = '';
}

document.addEventListener('DOMContentLoaded', function () {
    var modal = document.getElementById('modalImage');
    var modalContent = document.getElementById('modalContent');
    var modalBackdrop = document.getElementById('modalBackdrop');

    document.addEventListener('click', function (event) {
        var target = event.target;
        if (target !== modalContent && !modalContent.contains(target) && !target.matches('img[onclick^="showModal"]')) {
            modal.classList.add('hidden');
        }
    });

    modalBackdrop.addEventListener('click', function () {
        modal.classList.add('hidden');
    });
});
