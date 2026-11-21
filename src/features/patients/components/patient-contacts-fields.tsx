import { Button, Label, TextArea, TextField } from '@heroui/react'
import { FieldArray, useFormikContext } from 'formik'
import { Mail, MapPin, Phone, Plus, Trash2, UserRound, UsersRound } from 'lucide-react'
import { useRef } from 'react'
import { CheckField, ChoiceField, FormTextField } from '@/app/components/administration/admin-ui'
import type { SavedPatientContacts } from '@/hooks/use-patient-contacts'
import { translate as t, useAppTranslation } from '@/i18n'
import {
  hasPatientContactDetails,
  patientAddress,
  patientContactHeadings,
  patientContactValues,
  scrollPatientFieldIntoView,
  type PatientValues,
} from '../patients'

const contactTypeOptions = [
  { id: 'emergency', label: 'Emergency' },
  { id: 'primary', label: 'Primary' },
  { id: 'secondary', label: 'Secondary' },
]

export function PatientContactsFields({ savedContacts }: { savedContacts: SavedPatientContacts }) {
  useAppTranslation()
  const { values, setFieldValue, isSubmitting } = useFormikContext<PatientValues>()
  const newContactKey = useRef<string | null>(null)
  const address = patientAddress(values)
  return (
    <section className="col-span-full grid gap-4" aria-labelledby="patient-contacts-heading">
      <h3 id="patient-contacts-heading" className="flex items-center gap-2 text-sm font-semibold">
        <UsersRound size={17} className="admin-icon-violet" aria-hidden="true" />
        {t('Patient contacts')}
      </h3>
      <FieldArray name="contacts">
        {({ push, remove }) => (
          <>
            {values.contacts.map((contact, index) => {
              const field = `contacts.${index}`
              const label = t(patientContactHeadings[contact.contactType], { number: index + 1 })
              const needsName = savedContacts.has(contact.key) || hasPatientContactDetails(contact)
              return (
                <fieldset
                  key={contact.key}
                  className="min-w-0 scroll-mt-2 rounded-xl border border-border p-4"
                  ref={(field) => {
                    if (field && contact.key === newContactKey.current) {
                      newContactKey.current = null
                      scrollPatientFieldIntoView(field)
                    }
                  }}
                >
                  <legend className="px-1 text-xs font-semibold">{label}</legend>
                  <div className="patient-api-form">
                    <ChoiceField
                      label="Contact type"
                      value={contact.contactType}
                      options={contactTypeOptions}
                      icon={<UsersRound size={17} className="admin-icon-teal" />}
                      onChange={(value) => {
                        if (value) void setFieldValue(`${field}.contactType`, value)
                      }}
                    />
                    <FormTextField
                      name={`${field}.firstName`}
                      label="First name"
                      placeholder="Enter First Name"
                      icon={<UserRound size={17} className="admin-icon-violet" />}
                      required={needsName}
                    />
                    <FormTextField
                      name={`${field}.lastName`}
                      label="Last name"
                      placeholder="Enter Last Name"
                      icon={<UserRound size={17} className="admin-icon-violet" />}
                    />
                    <FormTextField
                      name={`${field}.relationship`}
                      label="Relationship"
                      placeholder="e.g., spouse or sibling"
                      icon={<UsersRound size={17} className="admin-icon-teal" />}
                    />
                    <FormTextField
                      name={`${field}.phone`}
                      label="Phone number"
                      placeholder="Enter phone number"
                      icon={<Phone size={17} className="admin-icon-blue" />}
                      type="tel"
                    />
                    <FormTextField
                      name={`${field}.email`}
                      label="Email"
                      placeholder="name@example.com"
                      icon={<Mail size={17} className="admin-icon-blue" />}
                      type="email"
                    />
                    <div className="col-span-full grid gap-2">
                      <CheckField
                        label="Same as contact info"
                        icon={<MapPin size={17} className="admin-icon-teal" />}
                        selected={contact.sameAsPatientAddress}
                        disabled={isSubmitting}
                        onChange={(selected) =>
                          void setFieldValue(`${field}.sameAsPatientAddress`, selected)
                        }
                      />
                      {contact.sameAsPatientAddress ? (
                        <TextField isReadOnly value={address}>
                          <Label className="text-xs font-semibold">{t('Address')}</Label>
                          <div className="relative w-full">
                            <MapPin
                              size={17}
                              aria-hidden="true"
                              className="pointer-events-none absolute start-3 top-3 z-10 admin-icon-teal"
                            />
                            <TextArea
                              className="w-full min-h-24 ps-10"
                              placeholder={t('Enter the patient address above')}
                            />
                          </div>
                        </TextField>
                      ) : (
                        <>
                          <FormTextField
                            name={`${field}.address1`}
                            label="Address"
                            placeholder="Enter Address"
                            icon={<MapPin size={17} className="admin-icon-teal" />}
                          />
                          <FormTextField
                            name={`${field}.address2`}
                            label="Additional address"
                            placeholder="Apartment, suite, or unit (optional)"
                            icon={<MapPin size={17} className="admin-icon-teal" />}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger-soft"
                    className="mt-3"
                    aria-label={t('Remove contact {{number}}', { number: index + 1 })}
                    isDisabled={isSubmitting}
                    onPress={() => remove(index)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    {t('Remove')}
                  </Button>
                </fieldset>
              )
            })}
            <Button
              type="button"
              size="sm"
              variant="primary"
              className="justify-self-start"
              isDisabled={isSubmitting}
              onPress={() => {
                const contact = patientContactValues()
                newContactKey.current = contact.key
                push(contact)
              }}
            >
              <Plus size={16} aria-hidden="true" />
              {t(values.contacts.length ? 'Add more' : 'Add contact')}
            </Button>
          </>
        )}
      </FieldArray>
    </section>
  )
}
