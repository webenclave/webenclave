$we = {
    enclaveIframe: null,
    enclaveWindow: null,
    enclaveId: null,
    tabId: null,
    msgUUID : null,

    postMessage: function (msg) {
        msg.uuid = this.msgUUID;
        return $we.enclaveWindow.postMessage(msg, '*');
    },

    sendMessage: function (msg, callBack) {
        msg.uuid = this.msgUUID;
        chrome.tabs.sendMessage($we.tabId, msg, callBack);
    }

}




function InitSecDom(event) {

    $we.tabId = event.data.tabId;

    let enclaveIframe = document.getElementById("wrapFrame");
    enclaveIframe.width = event.data.width;
    enclaveIframe.height = event.data.height;

    $we.enclaveIframe = enclaveIframe;
    $we.enclaveWindow = enclaveIframe.contentWindow;;
    $we.enclaveId = event.data.enclaveId;

}



function windowMessageHandler(event) {

    console.log(event);

    if (!event.data || !event.data.cmd || !event.data.uuid || ($we.msgUUID != null && $we.msgUUID != event.data.uuid)) {
        return;
    }

    switch (event.data.cmd) {
        case "Init":
            {
                $we.msgUUID = event.data.uuid
                InitSecDom(event);
                $we.postMessage(event.data);
                break;
            }
        case "Ping":
            {
                console.log('Pang');
                break;
            }
        case "DelegateFunc":
            {
                console.log('Proxy DelegateFunc');
                $we.sendMessage(event.data);
                break;
            }
        case "DelegateAttr":
            {
                console.log('Proxy DelegateAttr');
                $we.sendMessage(event.data);
                break;
            }
        case "UpdateAttr":
            {
                console.log('Proxy UpdateAttr')
                $we.postMessage(event.data);
                break;
            }
        case "Execute":
            {
                console.log('Proxy Execute');
                if (event.data['state'] == 101) {
                    $we.sendMessage(event.data);
                }
                else {
                    $we.postMessage(event.data);
                }
                break;
            }
        case "ExecuteReturn":
            {
                console.log('ExecuteReturn');
                if (event.data['state'] == 201) {
                    $we.sendMessage(event.data);
                }
                else {
                    $we.postMessage(event.data);
                }
                break;
            }
        default:
            return;
    }

    return;

};

window.addEventListener('message', windowMessageHandler);
