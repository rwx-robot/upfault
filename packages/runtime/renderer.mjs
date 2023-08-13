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
