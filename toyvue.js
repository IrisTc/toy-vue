export class Vue{
    constructor(config) {
        this.template = document.querySelector(config.el)
        this.data = reactive(config.data)
        for(let fnname in config.methods) {
            this[fnname] = () => {
                config.methods[fnname].apply(this.data)
            }
        }
        this.traversal(this.template)
    }

    traversal(node) {
        if(node.nodeType === Node.TEXT_NODE) {
            if(node.textContent.trim().match(/^{{([\s\S]+)}}$/)) {
                let name = RegExp.$1.trim()
                effect(()=>node.textContent = this.data[name])
            }
        }
        if(node.nodeType === Node.ELEMENT_NODE) {
            let attributes = node.attributes
            for(let attribute of attributes) {
                if(attribute.name === 'v-model'){
                    let name = attribute.value
                    effect(()=> node.value = this.data[name])
                    node.addEventListener('input', event =>{
                        this.data[name] = node.value})
                }
                if(attribute.name.match(/^v-bind:([\s\S]+)$/)) {
                    let attrname = RegExp.$1
                    let name = attribute.value 
                    effect(()=> node.setAttribute(attrname, this.data[name]))
                }
                if(attribute.name.match(/^v-on:([\s\S]+)$/)) {
                    let eventname = RegExp.$1
                    let fn = attribute.value
                    node.addEventListener(eventname, event = this[fn])
                }
            }
        }
        if(node.childNodes && node.childNodes.length) {
            for(let child of node.childNodes) {
                this.traversal(child)
            }
        }
    }
}

let currentEffect = null;
let effects = new Map();

function effect(fn) {
    currentEffect = fn;
    fn();
    currentEffect = null;
}

function reactive(obj) {
    let observed = new Proxy(obj, {
        get(obj, prop) {
            if(currentEffect) {
                if(!effects.has(obj)) {
                    effects.set(obj, new Map);
                }
                if(!effects.get(obj).has(prop)) {
                    effects.get(obj).set(prop, new Array)
                }
                effects.get(obj).get(prop).push(currentEffect)
            }
            return obj[prop]
        },
        set(obj, prop, value) {
            obj[prop] = value
            if(effects.has(obj) && effects.get(obj).has(prop)) {
                for(let effect of effects.get(obj).get(prop)) {
                    effect()
                }
            }
            return true
        }
    })
    return observed
}