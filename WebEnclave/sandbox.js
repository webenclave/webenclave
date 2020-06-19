$we = {
    enclaveId: null,
    postMessage: function (msg) {
        parent.postMessage(msg, '*');
    },
    mapDelegateAttr: new Map(),
    mapEventHandler: new Map(),
    env: {
        executeByEnclaveId: executeByEnclaveId,
        executeInHost: executeInHost,
        location: {},
        history: {},
        window: {}
    },
    finalScript: null,
    scriptNum: 0,
    executeByEnclaveId: executeByEnclaveId,
    executeInHost: executeInHost,
    delegateFuncList: [
        //Window fuctions
        {
            obj: null,
            func: 'alert',
            path: 'alert'
        },
        {
            obj: null,
            func: 'open',
            path: 'open'
        },
        {
            obj: null,
            func: 'close',
            path: 'close'
        },
        {
            obj: null,
            func: 'moveTo',
            path: 'moveTo'
        },
        {
            obj: null,
            func: 'resizeTo',
            path: 'resizeTo'
        },
        {
            obj: null,
            func: 'scroll',
            path: 'scroll'
        },
        {
            obj: null,
            func: 'scrollTo',
            path: 'scrollTo'
        },
        {
            obj: null,
            func: 'scrollBy',
            path: 'scrollBy'
        },
        {
            obj: null,
            func: 'confirm',
            path: 'confirm'
        },
        {
            obj: null,
            func: 'prompt',
            path: 'prompt'
        },
        //make it work with window.

        {
            obj: 'window',
            func: 'alert',
            path: 'alert'
        },
        {
            obj: 'window',
            func: 'open',
            path: 'open'
        },
        {
            obj: 'window',
            func: 'close',
            path: 'close'
        },
        {
            obj: 'window',
            func: 'moveTo',
            path: 'moveTo'
        },
        {
            obj: 'window',
            func: 'resizeTo',
            path: 'resizeTo'
        },
        {
            obj: 'window',
            func: 'scroll',
            path: 'scroll'
        },
        {
            obj: 'window',
            func: 'scrollTo',
            path: 'scrollTo'
        },
        {
            obj: 'window',
            func: 'scrollBy',
            path: 'scrollBy'
        },
        {
            obj: 'window',
            func: 'confirm',
            path: 'confirm'
        },
        {
            obj: 'window',
            func: 'prompt',
            path: 'prompt'
        },

        //Location functions
        {
            obj: 'location',
            func: 'assign',
            path: 'location.assign'
        },
        {
            obj: 'location',
            func: 'reload',
            path: 'location.reload'
        },
        {
            obj: 'location',
            func: 'replace',
            path: 'location.replace'
        },

        //History functions
        {
            obj: 'history',
            func: 'go',
            path: 'history.go'
        },
        {
            obj: 'history',
            func: 'back',
            path: 'history.back'
        },
        {
            obj: 'history',
            func: 'forward',
            path: 'history.forward'
        },
        {
            obj: 'history',
            func: 'pushState',
            path: 'history.pushState'
        },
        {
            obj: 'history',
            func: 'replaceState',
            path: 'history.replaceState'
        },

    ]
}

window['$we'] = $we;


//apply functions to $we by copy ref
function applyFunc(src, des, arrFunc) {
    for (let func of arrFunc) {
        des[func] = src[func];
    }
}

//apply attributes to $we by using Object.defineProperty
function applyAttr(src, des, arrAttr) {
    for (let attr of arrAttr) {
        Object.defineProperty(des, attr, {
            get: function () {
                return src[attr];
            },
            set: function (val) {
                src[attr] = val;
            }
        });
    }
}

function delegateFunc(obj, func, path) {
    obj[func] = function () {
        let args = arguments;
        $we.postMessage({
            cmd: 'DelegateFunc',
            path: path,
            args: [].slice.apply(args)
        });
    }
}

function delegateAttr(obj, attr, val, path) {
    let attrVal = val;

    Object.defineProperty(obj, attr, {
        get: function () {
            return attrVal;
        },
        set: function (value) {
            attrVal = value;

            $we.postMessage({
                cmd: 'DelegateAttr',
                path: path,
                val: value
            });

        }
    });

    $we.mapDelegateAttr.set(path, function (value) {
        attrVal = value;
    });

}

//url,type,data,headers,async,success,error
function ajax(opts = {}) {
    let options = {
        url: null,
        type: 'GET',    //GET or POST
        data: {},       //data 
        headers: {},    //Header:  "Content-Type","application/x-www-form-urlencoded"
        async: true,    //sync
        success: null,  //successCallBack
        error: null     //errorCallBack
    };

    for (let k in options) {
        if (opts[k]) {
            options[k] = opts[k];
        }
    }

    //process url
    if (!options.url) {
        return false;
    }

    //process data
    var arrData = [];
    for (let k in options.data) {
        arrData.push(`${k}=${options.data[k]}`);
    }
    let formData = arrData.join('&');
    //GET process
    if (options.type === 'GET' && arrData.length != 0) {
        options.url += '?' + formData;
        formData = null;
    }


    //process XHR
    let xhr = new XMLHttpRequest();
    xhr.open(options.type, options.url, options.async);

    //process headers
    for (let k in options.headers) {
        xhr.setRequestHeader(key, options.headers[k]);
    }

    //callback
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) {
            return;
        }
        if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
            // success(RES, STATE)
            if (options.success) {
                options.success(xhr.response, xhr.status);
            }
        } else {
            // error(XHR, STATE, ST)
            if (options.error) {
                options.error(xhr, xhr.status, xhr.statusText);
            }
        }
    };

    xhr.send(formData);
}

function appendScript(scriptNode, path, origin, isFinal = false) {
    let newScript = document.createElement('script');
    newScript.type = 'text/javascript';

    let withWE = !!scriptNode.attributes['extend'];

    //process flag 'final'
    if (!isFinal) {

        if (!$we.finalScript) {
            let withFinal = !!scriptNode.attributes['final'];

            if (withFinal) {
                $we.finalScript = {
                    scriptNode: scriptNode,
                    path: path,
                    origin: origin
                };
                return;
            }
        }

        $we.scriptNum++;

    }

    console.log(`Append script src = ${scriptNode.src} type = ${isFinal}, scriptNum = ${$we.scriptNum}`);

    let src = scriptNode.src;
    //check if we-src
    let wesrc = scriptNode.getAttribute('we-src');
    if (wesrc) {
        src = wesrc;
    }

    if (src == '') {
        newScript.text = withWE ? `with($we.env){${scriptNode.innerHTML}}` : scriptNode.innerHTML;
        document.body.appendChild(newScript);

        //process final
        if ($we.scriptNum > 0) {
            if (--$we.scriptNum == 0) {
                if ($we.finalScript) {
                    appendScript($we.finalScript.scriptNode, $we.finalScript.path, $we.finalScript.origin, true);
                }
            }
        }

    }
    else {

        let lowerSrc = src.toLowerCase();
        let url;

        if (lowerSrc.startsWith('http://') || lowerSrc.startsWith('https://')) {
            url = src;
        }
        else if (lowerSrc.startsWith('chrome-extension')) {
            src = src.replace('chrome-extension://', '');
            src = src.substring(src.indexOf('/') + 1);
            url = `${path}${src}`;
        }
        else if (lowerSrc.startsWith('/')) {
            url = `${origin}${src}`;
        } else {
            url = `${path}${src}`;
        }

        ajax({
            url: url,
            success: function (res, st) {
                newScript.text = withWE ? `with($we.env){${res}}` : res;
                document.body.appendChild(newScript);

                //process final
                if ($we.scriptNum > 0) {
                    if (--$we.scriptNum == 0) {
                        if ($we.finalScript) {
                            appendScript($we.finalScript.scriptNode, $we.finalScript.path, $we.finalScript.origin, true);
                        }
                    }
                }


            }
        });

    }

}

function setStyleToElement(ele, cssText, isRoot) {
    let styleArr = cssText.split(';');
    let oldStyle = window.getComputedStyle(ele);

    const marginStyles = ['margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom'];

    for (let s in styleArr) {
        let line = styleArr[s];
        let key = line.substring(0, line.indexOf(":")).trim();
        let value = line.substring(line.indexOf(":") + 1).trim();

        if (isRoot && marginStyles.indexOf(key) != -1) {
            ele.style[key] = "0px";
        } else {
            if (oldStyle[key] !== value) {
                ele.style[key] = value;
            }
        }

    }
}

function Init(event) {

    //init functionality before build others
    initFunctionality(event.data);

    $we.enclaveId = event.data.enclaveId;

    let html = event.data.html;


    document.body.innerHTML = event.data.html;
    // Send a reply
    //Compare the style
    let victimElement = document.body.getElementsByTagName('div')[0];

    //process scripts nodes
    let scriptNodes = document.body.getElementsByTagName('script');
    let arNodes = [];
    for (let i = 0; i < scriptNodes.length; i++) {
        let node = scriptNodes[i];
        arNodes.push(node);
    }

    $we.finalScript = null;
    $we.scriptNum = 0;
    arNodes.forEach(node => {
        document.body.removeChild(node);
        appendScript(node, event.data.path, event.data.origin);
    });

    let styleArr = event.data.style;

    //from the root
    let styleIndex = 0;

    let setAllNodeStyle = function (root) {

        setStyleToElement(root, styleArr[styleIndex], styleIndex++ == 0);

        if (root.children.length != 0) {
            for (let i = 0; i < root.children.length; i++) {
                setAllNodeStyle(root.children[i]);
            }
        }
    }

    setAllNodeStyle(victimElement);

    $we.postMessage({ cmd: 'Ping' });

}

function initFunctionality(data) {

    //process DelegateFunc
    $we.delegateFuncList.forEach(val => {

        delegateFunc(val.obj ? $we.env[val.obj] : $we.env, val.func, val.path);

    });


    //process DelegateAttr
    let arrAttrs = data.arrAttrs;
    for (let attr of arrAttrs) {

        let arrPath = attr.path.split('.');
        let obj = $we.env;
        for (let i = 0; i < arrPath.length - 1; i++) {
            obj = obj[arrPath[i]];
        }

        let attrName = arrPath[arrPath.length - 1];
        let val = attr.val;

        delegateAttr(obj, attrName, val, attr.path);

    }

    //process <a>


}

function executeInHost(execFunc, callback) {

}

function executeByEnclaveId(enclaveId, execFunc, isExtend, callback) {

    //prepare eval string
    let funcStr = `(${execFunc})($we.env)`;
    if (isExtend) {
        funcStr = `with($we.env){${funcStr}}`;
    }

    //generate event id
    let eventId = `eid_${Date.now()}`;

    $we.mapEventHandler.set(eventId, callback);

    $we.postMessage({
        cmd: 'Execute',
        funcStr: funcStr,
        eventId: eventId,
        desEnclaveId: enclaveId,
        srcEnclaveId: $we.enclaveId,
        state: 101 //101 = to host
    });

}

function Execute(data) {

    data.cmd = 'ExecuteReturn';
    data.state = 201; // 201 = to host
    data.error = null;

    try {
        data.result = eval(data.funcStr);
    }
    catch (ex) {
        data.error = ex.message;
    }

    $we.postMessage(data);

}

function ExecuteReturn(data) {

    let handler = $we.mapEventHandler.get(data.eventId);
    if (handler) {
        handler(data);
    }

}

function UpdateAttr(data) {
    let path = data.path;
    let val = data.val;

    let modifyFunction = $we.mapDelegateAttr.get(path);

    if (modifyFunction) {
        modifyFunction(val);
    }
}

var messageHandler = function (event) {

    if (!event.data) {
        return;
    }

    if (!event.data.cmd) {
        return;
    }

    switch (event.data.cmd) {
        case "Init":
            {
                Init(event);
                break;
            }
        case "UpdateAttr":
            {
                UpdateAttr(event.data);
                break;
            }
        case "Execute":
            {
                Execute(event.data);
                break;
            }
        case "ExecuteReturn":
            {
                ExecuteReturn(event.data);
                break;
            }
        default:
            return;
    }

    return;


};

window.addEventListener('message', messageHandler);

