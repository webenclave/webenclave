$we = {
    tabId: null,
    mapEnclaves: new Map(),
    msgUUID : uuidv4(),
    postMessage: function (msg) {
        for (let enclave of this.mapEnclaves.values()) {
            enclave.postMessage(msg);
        }
    },
    DelegateAttrList: [

        //Location attributions
        {
            obj: location,
            attr: 'hash',
            path: 'location.hash',
            event: 'hashchange',
            fetch: null
        },
        {
            obj: location,
            attr: 'href',
            path: 'location.href'
        },
        {
            obj: location,
            attr: 'host',
            path: 'location.host'
        },
        {
            obj: location,
            attr: 'hostname',
            path: 'location.hostname'
        },
        {
            obj: location,
            attr: 'origin',
            path: 'location.origin'
        },
        {
            obj: location,
            attr: 'pathname',
            path: 'location.pathname'
        },
        {
            obj: location,
            attr: 'port',
            path: 'location.port'
        },
        {
            obj: location,
            attr: 'protocol',
            path: 'location.protocol'
        },
        {
            obj: location,
            attr: 'search',
            path: 'location.search'
        },

        //window.innerWidth + innerHeight
        {
            obj: window,
            attr: 'innerWidth',
            path: 'innerWidth',
            event: 'resize'
        },
        {
            obj: window,
            attr: 'innerHeight',
            path: 'innerHeight',
            event: 'resize'
        },
        {
            obj: window,
            attr: 'scrollX',
            path: 'scrollX',
            event: 'scroll'
        },
        {
            obj: window,
            attr: 'scrollY',
            path: 'scrollY',
            event: 'scroll'
        },
        {
            obj: window,
            attr: 'origin',
            path: 'origin'
        },

        //History attributes

    ]
}


function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}


function Init(data) {
    $we.tabId = data.tabId;

    //collect event state and send to enclave.

    console.log('TabId = ' + data.tabId);

    let arrAttrs = [];
    //work out attributions.
    for (let dAttr of $we.DelegateAttrList) {

        let attrMsg = {
            path: dAttr.path,
            val: dAttr.obj[dAttr.attr]
        };

        arrAttrs.push(attrMsg);

        if (dAttr.event) {
            window.addEventListener(dAttr.event, function (event) {

                let newVal = dAttr.fetch ? dAttr.fetch(event) : dAttr.obj[dAttr.attr];

                $we.postMessage({
                    cmd: 'UpdateAttr',
                    path: dAttr.path,
                    val: newVal
                });

            });
        }

    }


    for (let enclave of $we.mapEnclaves.values()) {

        enclave.msg.tabId = data.tabId;
        enclave.msg.arrAttrs = arrAttrs;

        enclave.shadowIframe.onload = function () {
            enclave.postMessage(enclave.msg);
        }

        enclave.shadowRoot.appendChild(enclave.shadowIframe);
    }


}

function DelegateFunc(data) {
    let arrPath = data.path.split('.');
    let obj = window;
    for (let i = 0; i < arrPath.length - 1; i++) {
        obj = obj[arrPath[i]];
    }
    obj[arrPath[arrPath.length - 1]].apply(obj, data.args);
}

function DelegateAttr(data) {
    let arrPath = data.path.split('.');
    let obj = window;
    for (let i = 0; i < arrPath.length - 1; i++) {
        obj = obj[arrPath[i]];
    }
    obj[arrPath[arrPath.length - 1]] = data.val;
}

function Execute(data) {
    let desEnclave = $we.mapEnclaves.get(data.desEnclaveId);
    let srcEnclave = $we.mapEnclaves.get(data.srcEnclaveId);
    if (desEnclave) {
        data.state = 102; //102 = to enclave
        desEnclave.postMessage(data);
    }
    else {
        srcEnclave.postMessage({
            cmd: "ExecuteReturn",
            eventId: data.eventId,
            state: 202 //202 = to enclave
        });
    }
}

function ExecuteReturn(data) {
    let srcEnclave = $we.mapEnclaves.get(data.srcEnclaveId);
    if (srcEnclave) {
        data.state = 202; //202 = to enclave
        srcEnclave.postMessage(data);
    }
}


function messageCallback(request, sender, sendResponse) {

    let data = request;

    if (!data['cmd']) {
        return;
    }

    switch (data.cmd) {
        case "Init":
            {
                console.log('Begin Init Event.');
                Init(data);
                break;
            }
        case "DelegateFunc":
            {
                console.log('DelegateFunc');
                console.log(data);
                DelegateFunc(data);
                break;
            }
        case "DelegateAttr":
            {
                console.log('DelegateAttr');
                DelegateAttr(data);
                break;
            }
        case "Execute":
            {
                console.log('Execute');
                Execute(data);
                break;
            }
        case "ExecuteReturn":
            {
                console.log('ExecuteReturn');
                ExecuteReturn(data);
                break;
            }
        default: {
            return;
        }
    }

    return;


}

chrome.runtime.onMessage.addListener(messageCallback);


//Main Logic
function main(win) {

    let enclaveIdx = 1;
    let arrProcessedHtml = [];

    let doms = document.getElementsByTagName('web-enclave');

    if (doms.length == 0) {
        return;
    }

    let f_px2int = function (spx) {
        return spx.split("px")[0] - 0;
    };
    let f_int2px = function (ipx) {
        return ipx + "px";
    };
    let copyStyleFromNode = function (ele, arr) {
        arr.push(window.getComputedStyle(ele).cssText);

        if (ele.children.length != 0) {
            for (let i = 0; i < ele.children.length; i++) {
                copyStyleFromNode(ele.children[i], arr);
            }
        }
    };


    for (let k = 0; k < doms.length; k++) {

        let enclaveInfo = {};
        let dom = doms[k];

        //msg.id
        let id;
        let attrs = dom.attributes;
        for (let i = 0; i < attrs.length; i++) {
            if (attrs[i].name.toLowerCase() === 'id') {
                id = attrs[i].value;
                break;
            }
        }
        if (!id) {
            id = `__enclave_${enclaveIdx++}`;
        }

        if (dom.children.length == 0) {
            throw { id: id, num: 101, msg: 'The enclave must contain more than 1 node.' };
        }
        let contentNode = dom.children[0];
        let tagName = contentNode.tagName.toLowerCase();
        if (tagName != 'div') {
            throw { id: id, num: 102, msg: 'The first node of enclave must be an DIV.' };
        }

        //msg.html
        let fullHTML = dom.innerHTML;
        let processFullHTML = dom.outerHTML.replace(/\r\n/g, "").replace(/\n/g, "").replace(/\s+/g, "");
        arrProcessedHtml.push(processFullHTML);

        let x = Date.now();
        //msg.style
        let nodeStyleTextArr = [];
        copyStyleFromNode(contentNode, nodeStyleTextArr);

        let y = Date.now();
        //test style process time.
        console.log(`${y} - ${x} = ${y - x}`);


        //msg.width
        //msg.height
        let hostStyle = window.getComputedStyle(contentNode);
        let outerWidth, outerHeight;


        if (hostStyle.boxSizing == "border-box") {
            outerWidth = hostStyle.width;
            outerHeight = hostStyle.height
        }
        else// if(hostStyle.boxSizing == "content-box")
        {
            outerWidth = f_int2px(f_px2int(hostStyle.width) + f_px2int(hostStyle.borderLeftWidth) + f_px2int(hostStyle.borderRightWidth) + f_px2int(hostStyle.paddingLeft) + f_px2int(hostStyle.paddingRight));
            outerHeight = f_int2px(f_px2int(hostStyle.height) + f_px2int(hostStyle.borderTopWidth) + f_px2int(hostStyle.borderBottomWidth) + f_px2int(hostStyle.paddingTop) + f_px2int(hostStyle.paddingBottom));
        }

        //clear after fetch style
        dom.innerHTML = '';

        //msg.path
        let path = location.href.substr(0, location.href.lastIndexOf('/') + 1);
        let origin = location.origin;

        //create element iframe
        let shadowIframe = document.createElement('iframe');

        shadowIframe.scrolling = "no";
        shadowIframe.frameBorder = "0";
        //shadowIframe.style.display = "block";
        shadowIframe.width = outerWidth;
        shadowIframe.height = outerHeight;


        shadowIframe.src = chrome.extension.getURL('proxy.html');

        //create shadow dom
        let shadowRoot;
        if (dom['createShadowRoot']) {
            shadowRoot = dom.createShadowRoot();
        }
        else {
            shadowRoot = dom.attachShadow({ mode: 'closed' });
        }

        //save to enclaveInfo
        enclaveInfo.shadowRoot = shadowRoot;
        enclaveInfo.shadowIframe = shadowIframe;
        enclaveInfo.msg = { html: fullHTML, id: id, style: nodeStyleTextArr, path: path, origin: origin, cmd: 'Init', width: outerWidth, height: outerHeight };
        enclaveInfo.id = id;
        enclaveInfo.postMessage = function (msg) {
            msg.uuid = $we.msgUUID;
            this.shadowIframe.contentWindow.postMessage(msg, '*');
        }

        $we.mapEnclaves.set(id, enclaveInfo);

        //style the element
        let shadowStyle = window.getComputedStyle(dom);
        const attrPos = ['margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom', 'float', 'display', 'clear'];
        for (let k of attrPos) {
            if (shadowStyle[k] != hostStyle[k]) {
                dom.style[k] = hostStyle[k];
            }
        }

    };

    //verify
    let arrDigest = [];
    let arrPromise = [];

    let enclaveHtml = arrProcessedHtml.join('|').replace(/\/>/g, ">").replace(/=""/g, "");
    //some common, not all. for prototype.
    enclaveHtml = enclaveHtml.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&copy;/g, "©").replace(/&nbsp;/g, " ");

    console.log(enclaveHtml);
    console.log(enclaveHtml.length);

    const encoder = new TextEncoder();
    crypto.subtle.digest('SHA-256', encoder.encode(enclaveHtml)).then(val => {

        let hashArray = Array.from(new Uint8Array(val));
        let hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        console.log('Verify Hash = ' + hashHex);

        chrome.runtime.sendMessage({ cmd: "Verify", token: hashHex, num: arrProcessedHtml.length, origin: location.origin });

    });


}

main(window);




window.addEventListener('hashchange', function (event) {
    console.log(event);
})

