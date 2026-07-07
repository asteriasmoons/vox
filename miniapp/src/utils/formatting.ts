export function wrapSelection(textarea: HTMLTextAreaElement, before: string, after = before): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end) || 'text';
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;

  textarea.value = next;
  textarea.focus();
  textarea.selectionStart = start + before.length;
  textarea.selectionEnd = start + before.length + selected.length;
  return next;
}

export function insertAtCursor(textarea: HTMLTextAreaElement, insertion: string): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const next = `${value.slice(0, start)}${insertion}${value.slice(end)}`;

  textarea.value = next;
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
  return next;
}
