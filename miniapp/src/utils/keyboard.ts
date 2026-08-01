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

  const dismissFromScroll = () => {
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
