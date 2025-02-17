import { Layout } from '@app/components/layout'
import { BreadcrumbLink } from '@app/components/shared/breadcrumb'
import PageHeading from '@app/components/shared/page-heading'
import DyoButton from '@app/elements/dyo-button'
import { DyoCard } from '@app/elements/dyo-card'
import { DyoHeading } from '@app/elements/dyo-heading'
import { DyoInput } from '@app/elements/dyo-input'
import { DyoLabel } from '@app/elements/dyo-label'
import {
  ROUTE_NEW_PASSWORD,
  ROUTE_SETTINGS,
  ROUTE_SETTINGS_CHANGE_PASSWORD,
  ROUTE_SETTINGS_EDIT_PROFILE,
  ROUTE_SETTINGS_TOKENS,
  ROUTE_VERIFICATION,
} from '@app/routes'
import { redirectTo, withContextAuthorization } from '@app/utils'
import { Identity } from '@ory/kratos-client'
import { sessionOfContext } from '@server/kratos'
import { NextPageContext } from 'next'
import useTranslation from 'next-translate/useTranslation'

const SettingsPage = (props: Identity) => {
  const { traits } = props

  const { t } = useTranslation('settings')

  const pageLink: BreadcrumbLink = {
    name: t('common:profile'),
    url: ROUTE_SETTINGS,
  }

  return (
    <Layout title={t('common:profile')}>
      <PageHeading pageLink={pageLink}>
        <div className="ml-auto">
          <DyoButton href={ROUTE_SETTINGS_TOKENS}>{t('profileToken')}</DyoButton>
          <DyoButton href={ROUTE_SETTINGS_EDIT_PROFILE}>{t('editProfile')}</DyoButton>
          <DyoButton href={ROUTE_SETTINGS_CHANGE_PASSWORD}>{t('changePass')}</DyoButton>
        </div>
      </PageHeading>

      <DyoCard className="flex flex-col text-bright p-8">
        <DyoHeading element="h2" className="text-2xl">
          {t('profile')}
        </DyoHeading>
        <DyoLabel textColor="text-bright-muted">{t('tips')}</DyoLabel>
        <div className="flex flex-col w-1/2">
          <DyoInput
            label={t('common:firstName')}
            name="firstName"
            type="text"
            defaultValue={traits.name?.first}
            disabled
            grow
          />

          <DyoInput
            label={t('common:lastName')}
            name="lastName"
            type="text"
            defaultValue={traits.name?.last}
            disabled
            grow
          />

          <DyoInput label={t('common:email')} name="email" type="email" defaultValue={traits.email} disabled grow />
        </div>
      </DyoCard>
    </Layout>
  )
}

export default SettingsPage

const getPageServerSideProps = async (context: NextPageContext) => {
  const { flow } = context.query
  if (flow) {
    return redirectTo(`${ROUTE_NEW_PASSWORD}?flow=${flow}`)
  }

  const session = sessionOfContext(context)

  const { identity } = session
  const { email } = identity.traits
  const verifiable = identity.verifiable_addresses?.filter(it => it.value === email && !it.verified)

  if ((verifiable?.length ?? 0) > 0) {
    const address = verifiable[0]

    return redirectTo(`${ROUTE_VERIFICATION}?email=${address.value}`)
  }

  return {
    props: identity,
  }
}

export const getServerSideProps = withContextAuthorization(getPageServerSideProps)
