let keyboardDismissalInitialized = false;

const editableSelector = 'input, textarea, select, [contenteditable="true"]';
const nonTextInputTypes = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

export function initKeyboardDismissal(): void {
  if (keyboardDismissalInitialized) {
    return;
  }

  keyboardDismissalInitialized = true;

  const dismissFromTap = (event: Event) => {
    if (isEditableTarget(event.target)) {
      return;
    }

    blurActiveEditable();
  };

  // Only dismiss on scroll when the scroll happened OUTSIDE the currently
  // focused text field. Typing into a textarea can trigger the browser to
  // auto-scroll the field itself into view — dismissing the keyboard there
  // kicks the user out of the field on every keystroke. This guard keeps
  // the tap-to-dismiss behavior for the rest of the app.
  const dismissFromScroll = (event: Event) => {
    const active = document.activeElement;
    if (isEditableElement(active) && event.target instanceof Node && (active === event.target || active.contains(event.target))) {
      return;
    }
    blurActiveEditable();
  };

  document.addEventListener('pointerdown', dismissFromTap, { capture: true, passive: true });
  document.addEventListener('touchstart', dismissFromTap, { capture: true, passive: true });
  document.addEventListener('scroll', dismissFromScroll, { capture: true, passive: true });
  document.addEventListener('touchmove', dismissFromScroll, { passive: true });
  window.addEventListener('scroll', dismissFromScroll, { passive: true });
}

function blurActiveEditable(): void {
  const activeElement = document.activeElement;

  if (isEditableElement(activeElement)) {
    activeElement.blur();
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest(editableSelector));
}

function isEditableElement(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  if (element instanceof HTMLInputElement) {
    return !nonTextInputTypes.has(element.type);
  }

  return element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
}
