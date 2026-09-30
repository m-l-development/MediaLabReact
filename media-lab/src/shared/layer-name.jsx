import React from 'react';

/* Lagnavn i laglister: dobbeltklikk gir et tekstfelt. Enter/klikk utenfor lagrer, Esc avbryter. */
export default function LayerName({ value, onRename, style }) {
  const [edit, setEdit] = React.useState(false);
  const name = value == null ? '' : String(value);
  const stop = e => e.stopPropagation();
  if (edit) return (
    <input autoFocus defaultValue={name} maxLength={60} data-no-i18n="1" aria-label="Lagnavn"
      onFocus={e => e.currentTarget.select()} onClick={stop} onDoubleClick={stop} onPointerDown={stop} onMouseDown={stop}
      draggable onDragStart={e => { e.preventDefault(); e.stopPropagation(); }}
      onKeyDown={e => { stop(e); if (e.key === 'Enter') e.currentTarget.blur(); else if (e.key === 'Escape') { e.currentTarget.value = name; e.currentTarget.blur(); } }}
      onBlur={e => { setEdit(false); const v = e.currentTarget.value.trim().slice(0, 60); if (v !== name && onRename) onRename(v); }}
      style={{ ...style, flex: '1', minWidth: '0', height: '24px', padding: '0 6px', border: '1px solid #3d8bff', borderRadius: '6px', background: '#0e0e0e', color: '#f3f1ec', font: 'inherit', fontSize: (style && style.fontSize) || '12px', fontWeight: (style && style.fontWeight) || '600', outline: 'none' }} />
  );
  return <span data-no-i18n="1" title="Dobbeltklikk for å gi nytt navn" onDoubleClick={e => { stop(e); if (onRename) setEdit(true); }} style={style}>{name}</span>;
}
