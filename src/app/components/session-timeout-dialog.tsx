import { Button, Modal } from '@heroui/react'
import { Clock3 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { router } from '@/router'
import { translate as t, useAppTranslation } from '@/i18n'

export function SessionTimeoutDialog() {
  useAppTranslation()
  const reason = useAuthStore((state) => state.auth.sessionExpiryReason)
  return (
    <Modal.Backdrop isOpen={!!reason} isDismissable={false} isKeyboardDismissDisabled>
      <Modal.Container size="sm" placement="center">
        <Modal.Dialog className="app-dialog">
          <Modal.Header className="dialog-inline-heading">
            <Clock3 size={18} className="text-warning" aria-hidden="true" />
            <Modal.Heading>{t('Session expired')}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm text-muted">
              {t(
                reason === 'inactivity'
                  ? 'You were signed out after 2 minutes of inactivity. Please sign in again to continue.'
                  : 'Your session has expired. Please sign in again to continue.',
              )}
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onPress={() => {
                useAuthStore.getState().auth.dismissSessionExpiry()
                void router.navigate({ to: '/login', replace: true })
              }}
            >
              {t('Sign in again')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
