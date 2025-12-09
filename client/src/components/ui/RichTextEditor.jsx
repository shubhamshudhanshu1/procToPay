import React, { useRef, useEffect } from 'react';
import { Box, FormLabel, FormHelperText, Button, ButtonGroup, Paper } from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
} from '@mui/icons-material';

/**
 * Simple Rich Text Editor Component using contentEditable
 *
 * Features:
 * - Basic typography (bold, italic, underline)
 * - Lists (ordered, unordered)
 * - Alignment (left, center, right, justify)
 * - Simple and works with React 19
 */
const RichTextEditor = ({
  value,
  onChange,
  label,
  error = false,
  helperText,
  placeholder = 'Enter content...',
  sx = {},
  ...props
}) => {
  const editorRef = useRef(null);
  const isComposingRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current && !isComposingRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
    handleInput();
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const formatText = (command) => {
    execCommand(command);
  };

  const formatList = (command) => {
    execCommand(command);
  };

  const formatAlign = (command) => {
    execCommand('justify' + command);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleInput();
  };

  return (
    <Box sx={{ ...sx }}>
      {label && (
        <FormLabel
          sx={{
            display: 'block',
            mb: 1,
            color: error ? 'error.main' : 'text.primary',
          }}
        >
          {label}
        </FormLabel>
      )}

      {/* Toolbar */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: error ? 'error.main' : 'divider',
          borderBottom: 'none',
          borderRadius: '4px 4px 0 0',
          p: 0.5,
          backgroundColor: '#fafafa',
          display: 'flex',
          gap: 0.5,
          flexWrap: 'wrap',
        }}
      >
        <ButtonGroup size="small" variant="text">
          <Button onClick={() => formatText('bold')} title="Bold" sx={{ minWidth: 40 }}>
            <FormatBold fontSize="small" />
          </Button>
          <Button onClick={() => formatText('italic')} title="Italic" sx={{ minWidth: 40 }}>
            <FormatItalic fontSize="small" />
          </Button>
          <Button onClick={() => formatText('underline')} title="Underline" sx={{ minWidth: 40 }}>
            <FormatUnderlined fontSize="small" />
          </Button>
        </ButtonGroup>

        <ButtonGroup size="small" variant="text">
          <Button
            onClick={() => formatList('insertUnorderedList')}
            title="Bullet List"
            sx={{ minWidth: 40 }}
          >
            <FormatListBulleted fontSize="small" />
          </Button>
          <Button
            onClick={() => formatList('insertOrderedList')}
            title="Numbered List"
            sx={{ minWidth: 40 }}
          >
            <FormatListNumbered fontSize="small" />
          </Button>
        </ButtonGroup>

        <ButtonGroup size="small" variant="text">
          <Button onClick={() => formatAlign('Left')} title="Align Left" sx={{ minWidth: 40 }}>
            <FormatAlignLeft fontSize="small" />
          </Button>
          <Button onClick={() => formatAlign('Center')} title="Align Center" sx={{ minWidth: 40 }}>
            <FormatAlignCenter fontSize="small" />
          </Button>
          <Button onClick={() => formatAlign('Right')} title="Align Right" sx={{ minWidth: 40 }}>
            <FormatAlignRight fontSize="small" />
          </Button>
          <Button onClick={() => formatAlign('Full')} title="Justify" sx={{ minWidth: 40 }}>
            <FormatAlignJustify fontSize="small" />
          </Button>
        </ButtonGroup>
      </Paper>

      {/* Editor */}
      <Box
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onPaste={handlePaste}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        sx={{
          minHeight: '200px',
          maxHeight: '400px',
          overflowY: 'auto',
          p: 2,
          border: '1px solid',
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: '0 0 4px 4px',
          backgroundColor: '#fff',
          fontSize: '0.875rem',
          fontFamily: 'inherit',
          outline: 'none',
          '&:focus': {
            borderColor: error ? 'error.main' : 'primary.main',
            borderWidth: '2px',
          },
          '&:empty:before': {
            content: 'attr(data-placeholder)',
            color: 'rgba(0, 0, 0, 0.38)',
            pointerEvents: 'none',
          },
          '& p': {
            margin: '0.5rem 0',
            '&:first-of-type': {
              marginTop: 0,
            },
            '&:last-of-type': {
              marginBottom: 0,
            },
          },
          '& ul, & ol': {
            margin: '0.5rem 0',
            paddingLeft: '1.5rem',
          },
          '& h1': {
            fontSize: '1.5rem',
            fontWeight: 600,
            margin: '1rem 0',
          },
          '& h2': {
            fontSize: '1.25rem',
            fontWeight: 600,
            margin: '0.75rem 0',
          },
          '& h3': {
            fontSize: '1.125rem',
            fontWeight: 600,
            margin: '0.5rem 0',
          },
        }}
        {...props}
      />

      {helperText && (
        <FormHelperText error={error} sx={{ mt: 0.5 }}>
          {helperText}
        </FormHelperText>
      )}
    </Box>
  );
};

export default RichTextEditor;
