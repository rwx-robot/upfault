// Browser-compatible renderer for UpFault Runtime
// This is a minimal implementation for the counter example

export function createRenderer(options) {
  const {
    createElement,
    createText,
    createComment,
    setElementText,
    setText,
    insert,
    remove,
    patchProp,
    parentNode,
    nextSibling,
    _nodeToElement,
  } = options;

  const containerVNodes = new WeakMap();

  function getContainerVNode(container) {
    return containerVNodes.get(container) ?? null;
  }

  function setContainerVNode(container, vnode) {
    containerVNodes.set(container, vnode);
  }

  const toElement = _nodeToElement || ((node) => node);

  function mountElement(vnode, parent, anchor = null) {
    const { type, props, children, shapeFlag, patchFlag, ref } = vnode;
    const isSVG = type === 'svg' || vnode.isSVG;
    const el = createElement(type, isSVG);
    vnode.el = el;

    if (props) {
      for (const key in props) {
        if (key !== 'children' && key !== 'key' && key !== 'ref') {
          patchProp(el, key, null, props[key]);
        }
      }
    }

    if (shapeFlag & 1) { // TEXT_NODE
      setElementText(el, children);
    } else if (shapeFlag & 16) { // ARRAY_CHILDREN
      mountChildren(children, el, null);
    }

    insert(el, parent, anchor);

    if (ref) {
      setRef(ref, el);
    }
  }

