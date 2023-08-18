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

  function mountChildren(children, parent, anchor) {
    for (const child of children) {
      if (child == null) continue;
      patch(null, child, parent, anchor);
    }
  }

  function mountText(vnode, parent, anchor = null) {
    const el = createText(vnode.children);
    vnode.el = el;
    insert(el, parent, anchor);
  }

  function mountComment(vnode, parent, anchor = null) {
    const el = createComment(vnode.children || '');
    vnode.el = el;
    insert(el, parent, anchor);
  }

  function mountFragment(vnode, parent, anchor = null) {
    mountChildren(vnode.children, parent, anchor);
  }

  function mountComponent(vnode, parent, anchor = null) {
    console.warn('Component mounting not fully implemented in minimal renderer');
    if (typeof vnode.type === 'function') {
      const result = vnode.type();
      patch(null, result, parent, anchor);
      vnode.el = result.el;
    }
  }

  function setRef(ref, value) {
    if (!ref) return;
    if (typeof ref === 'function') {
      ref(value);
    } else if (ref && typeof ref === 'object' && '__v_isRef' in ref) {
      ref.value = value;
    }
  }

  function patch(n1, n2, parent, anchor = null) {
    if (n1 === n2) return;
    
    if (!n1) {
      if (!n2) return;
      mount(n2, parent, anchor);
      return;
    }

    if (!n2) {
      unmount(n1, parent);
      return;
    }

    const { shapeFlag, vnodeType } = n2;

    if (vnodeType === 2) { // ELEMENT
      patchElement(n1, n2);
    } else if (vnodeType === 1) { // TEXT
      if (n1.children !== n2.children) {
        setText(n1.el, n2.children);
      }
    } else if (vnodeType === 5) { // FRAGMENT
      patchChildren(n1, n2, n1.el);
    } else if (vnodeType === 3) { // COMPONENT
      // Component update not implemented in minimal version
    }
  }

  function patchElement(n1, n2) {
    const el = n1.el;
    n2.el = el;

    const oldProps = n1.props || {};
    const newProps = n2.props || {};

    for (const key in newProps) {
      if (oldProps[key] !== newProps[key]) {
        patchProp(el, key, oldProps[key], newProps[key]);
      }
    }

    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProp(el, key, oldProps[key], null);
      }
    }

    patchChildren(n1, n2, el);
  }

  function patchChildren(n1, n2, parent) {
    const c1 = n1.children;
    const c2 = n2.children;
    const shapeFlag1 = n1.shapeFlag ?? 0;
    const shapeFlag2 = n2.shapeFlag ?? 0;

    if (shapeFlag2 & 1) { // TEXT_NODE
      if (shapeFlag1 & 16) {
        unmountChildren(c1);
      }
      if (c1 !== c2) {
        setElementText(parent, c2);
      }
      return;
    }

    if (shapeFlag2 & 16) { // ARRAY_CHILDREN
      if (shapeFlag1 & 16) {
        patchKeyedChildren(c1, c2, parent);
      } else {
        if (shapeFlag1 & 1) {
          setElementText(parent, '');
        }
        mountChildren(c2, parent, null);
      }
      return;
    }

    if (shapeFlag1 & 16) {
      unmountChildren(c1);
    } else if (shapeFlag1 & 1) {
      setElementText(parent, '');
    }
  }

  function patchKeyedChildren(c1, c2, parent) {
    unmountChildren(c1);
    mountChildren(c2, parent, null);
  }

  function unmount(vnode, parent = null) {
    if (!vnode) return;

    const { shapeFlag = 0, vnodeType, el, componentInstance } = vnode;

    if (vnodeType === 3 && componentInstance) {
      return;
    }

    if (shapeFlag & 16) {
      unmountChildren(vnode.children);
    }

    if (vnode.ref) {
      setRef(vnode.ref, null);
    }

    if (el && parent) {
      remove(el);
    }
  }

  function unmountChildren(children) {
    for (const child of children) {
      if (child) unmount(child);
    }
  }

  function mount(vnode, parent, anchor = null) {
    if (!vnode) return;
    const { vnodeType } = vnode;

    if (vnodeType === 2) { // ELEMENT
      mountElement(vnode, parent, anchor);
    } else if (vnodeType === 1) { // TEXT
      mountText(vnode, parent, anchor);
    } else if (vnodeType === 6) { // COMMENT
      mountComment(vnode, parent, anchor);
    } else if (vnodeType === 5) { // FRAGMENT
      mountFragment(vnode, parent, anchor);
    } else if (vnodeType === 3) { // COMPONENT