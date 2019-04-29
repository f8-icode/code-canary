const request = require("request");
var User = require("../dao/models/user");

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

async function handleMessage(sender_psid, received_message) {

    var user = await User.findOne({ "sender_psid": sender_psid });
    if (!user) {
        user = new User({
            sender_psid: sender_psid,
        });
        user.save();
    }

    let response;
    var postbackResponse = {};

    if (received_message.text) {
        // Create the payload for a basic text message, which
        // will be added to the body of our request to the Send API

        if (user.lessons && user.lessons.length > 0) {
            const lesson = user.lessons[0];
            console.log({ progress: lesson.progress });

            if (lesson.progress === 0  && received_message.text === 'Start') {
                lesson.status = 'in_progress';

                user.save();

                response = constructTextResponse('Hi! So you want to create a homepage?');
                lesson.progress++;
                user.save();
            }

            // Response to: Hi! "So you want to create a homepage?"
            if (lesson.progress === 1) {
                if (received_message.text === 'No') {
                    response = constructTextResponse('Why? :-(');
                    user.save();
                } else {
                    response = constructTextResponse('What do you want your homepage to be about?');
                    user.save();
                }
            }
        } else {
            response = constructTextResponse(`You sent the message: "${received_message.text}". Now send me an attachment!`);
        }

    } else if (received_message.attachments) {
        // Get the URL of the message attachment
        // let attachment_url = received_message.attachments[0].payload.url;
        response = constructTemplateResponse('Nothing');
    }

    postbackResponse = constructResponseMessage(sender_psid, response)
    // Send the message to acknowledge the postback
    callSendAPI(postbackResponse);
}

function handlePostback(sender_psid, received_postback) {
    var response;
    // Get the payload for the postback
    let payload = received_postback.payload;

    console.log("Postback response:", received_postback);

    // Set the response based on the postback payload
    if (payload === "yes") {
        response = constructTextResponse("Thanks!");
    } else if (payload === "no") {
        response = constructTextResponse("Oops, try sending another image.");
    }

    let postbackResponse = constructResponseMessage(sender_psid, response)

    // Send the message to acknowledge the postback
    callSendAPI(postbackResponse);
}

function callSendAPI(userMessage) {
    // Construct the message body

    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v3.2/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "headers": { "Content-Type": "application/json" },
        "json": userMessage,
    }, (err, res, body) => {
        switch (res.statusCode) {
            case 200:
                console.log("Message sent to user successfully!");
                break;
            default:
                console.error("Unable to send message:", userMessage);
                console.error("Received Error:", err);
                console.error("Response was:", body);
                break;
        }
    });
}

function constructResponseMessage(sender_psid, response) {
    return {
        "messaging_type": "RESPONSE",
        "recipient": {
            "id": sender_psid,
        },
        "message": response,
    };
}

function constructTextResponse(message) {
    return {
        "text": message,
    };
}

function constructTemplateResponse() {
    return {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [
                    {
                        "title": "Is this the right picture?",
                        "subtitle": "Tap a button to answer.",
                        "buttons": [
                            {
                                "type": "postback",
                                "title": "Yes!",
                                "payload": "yes",
                            },
                            {
                                "type": "postback",
                                "title": "No!",
                                "payload": "no",
                            },
                        ],
                    }],
            },
        },
    };
}


module.exports = {
    handleMessage: handleMessage,
    handlePostback: handlePostback
}