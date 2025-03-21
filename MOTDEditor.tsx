onChange={() => {
  if (onChange) {
    const plainText = serializeToString(editor.children);
    console.log("编辑器内容变更:", plainText); // 添加调试日志
    onChange(editor.children as Descendant[], plainText);
  }
}} 