import { useEffect } from 'react'
import { useField, useFormikContext } from 'formik'
import { Button } from '@heroui/react'
import { EditorContent, useEditor, useEditorState, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  RemoveFormatting,
} from 'lucide-react'
import { translate as t, useAppTranslation } from '@/i18n'

// Treat legacy plain text as text nodes so literal angle brackets are preserved.
function initialContent(value: string): string | JSONContent {
  if (/<\/?(?:p|div|br|strong|b|em|i|u|s|ul|ol|li|blockquote)(?:\s[^>]*|\s*\/?)>/i.test(value))
    return value
  return {
    type: 'doc',
    content: (value || '').split(/\r?\n/).map((line) => ({
      type: 'paragraph',
      ...(line ? { content: [{ type: 'text', text: line }] } : {}),
    })),
  }
}
export function PatientAllergiesEditor() {
  useAppTranslation()
  const [field, meta, helpers] = useField<string>('allergies')
  const { isSubmitting } = useFormikContext()
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
    ],
    content: initialContent(field.value),
    editable: !isSubmitting,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': t('Allergies'),
        'aria-multiline': 'true',
        class: 'patient-rich-text-content',
      },
    },
    onUpdate: ({ editor: current }) => {
      void helpers.setValue(current.isEmpty ? '' : current.getHTML())
    },
    onBlur: () => {
      void helpers.setTouched(true)
    },
  })
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive('bold'),
      italic: current?.isActive('italic'),
      underline: current?.isActive('underline'),
      strike: current?.isActive('strike'),
      bullet: current?.isActive('bulletList'),
      ordered: current?.isActive('orderedList'),
      quote: current?.isActive('blockquote'),
      undo: current?.can().undo(),
      redo: current?.can().redo(),
    }),
  })
  useEffect(() => {
    if (editor && field.value !== (editor.isEmpty ? '' : editor.getHTML()))
      editor.commands.setContent(initialContent(field.value), { emitUpdate: false })
  }, [editor, field.value])
  const tools = [
    {
      label: 'Bold',
      icon: Bold,
      active: state?.bold,
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      icon: Italic,
      active: state?.italic,
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Underline',
      icon: Underline,
      active: state?.underline,
      run: () => editor?.chain().focus().toggleUnderline().run(),
    },
    {
      label: 'Strikethrough',
      icon: Strikethrough,
      active: state?.strike,
      run: () => editor?.chain().focus().toggleStrike().run(),
    },
    {
      label: 'Bullet list',
      icon: List,
      active: state?.bullet,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      icon: ListOrdered,
      active: state?.ordered,
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'Quote',
      icon: Quote,
      active: state?.quote,
      run: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      label: 'Clear formatting',
      icon: RemoveFormatting,
      run: () => editor?.chain().focus().unsetAllMarks().clearNodes().run(),
    },
    {
      label: 'Undo',
      icon: Undo2,
      disabled: !state?.undo,
      run: () => editor?.chain().focus().undo().run(),
    },
    {
      label: 'Redo',
      icon: Redo2,
      disabled: !state?.redo,
      run: () => editor?.chain().focus().redo().run(),
    },
  ]
  return (
    <div className="patient-rich-text-field">
      <label className="text-xs font-semibold" onClick={() => editor?.commands.focus()}>
        {t('Allergies')}
      </label>
      <div className="patient-rich-text-editor">
        <div role="group" aria-label={t('Text formatting')} className="patient-rich-text-toolbar">
          {tools.map(({ label, icon: Icon, active, disabled, run }) => (
            <span key={label} title={t(label)}>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label={t(label)}
                aria-pressed={active}
                isDisabled={!editor || isSubmitting || disabled}
                onPress={run}
              >
                <Icon size={16} />
              </Button>
            </span>
          ))}
        </div>
        <div className="patient-rich-text-surface">
          <EditorContent editor={editor} />
          {editor?.isEmpty && (
            <span className="patient-rich-text-placeholder" aria-hidden="true">
              {t('Enter Allergies')}
            </span>
          )}
        </div>
      </div>
      {meta.touched && meta.error && (
        <p role="alert" className="text-xs text-danger">
          {t(meta.error)}
        </p>
      )}
    </div>
  )
}
