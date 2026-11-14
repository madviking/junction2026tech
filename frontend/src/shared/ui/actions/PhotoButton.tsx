import { Button, FileButton } from '@mantine/core'
import { useRef, type ReactNode } from 'react'
import classes from './actions.module.css'

export interface PhotoButtonProps {
  variant?: 'primary' | 'secondary'
  fullWidth?: boolean
  disabled?: boolean
  icon?: ReactNode
  /** Open the back camera directly on phones. Without it: the photo library / file picker. */
  camera?: boolean
  onPhoto: (file: File) => void
  children: ReactNode
}

const MANTINE_VARIANT = { primary: 'filled', secondary: 'outline' } as const
const BUTTON_CLASSES = { root: classes.buttonRoot, label: classes.buttonLabel }

/**
 * A button that takes or picks one photo (the platform camera through a file input, so it
 * needs no camera permission prompt of ours). Looks like `ActionButton`.
 */
export function PhotoButton({ variant = 'primary', fullWidth, disabled, icon, camera, onPhoto, children }: PhotoButtonProps) {
  // Cleared after every pick so the same photo can be chosen again.
  const resetRef = useRef<() => void>(null)
  return (
    <FileButton
      accept="image/*"
      capture={camera ? 'environment' : undefined}
      disabled={disabled}
      resetRef={resetRef}
      onChange={(file) => {
        if (file) onPhoto(file)
        resetRef.current?.()
      }}
    >
      {(props) => (
        <Button
          {...props}
          type="button"
          variant={MANTINE_VARIANT[variant]}
          color="primary"
          fullWidth={fullWidth}
          disabled={disabled}
          leftSection={icon}
          radius="md"
          classNames={BUTTON_CLASSES}
          data-kind={variant}
        >
          {children}
        </Button>
      )}
    </FileButton>
  )
}
