import MultiInput from '@app/components/editor/multi-input'
import { ItemEditorState } from '@app/components/editor/use-item-editor-state'
import KeyOnlyInput from '@app/components/shared/key-only-input'
import KeyValueInput from '@app/components/shared/key-value-input'
import SecretKeyInput from '@app/components/shared/secret-key-input'
import SecretKeyValueInput from '@app/components/shared/secret-key-value-input'
import DyoChips from '@app/elements/dyo-chips'
import { DyoHeading } from '@app/elements/dyo-heading'
import { DyoLabel } from '@app/elements/dyo-label'
import DyoSwitch from '@app/elements/dyo-switch'
import {
  CommonConfigProperty,
  COMMON_CONFIG_PROPERTIES,
  filterContains,
  filterEmpty,
  ImageConfigProperty,
} from '@app/models'
import {
  CommonConfigDetails,
  ContainerConfigData,
  ContainerConfigExposeStrategy,
  CONTAINER_EXPOSE_STRATEGY_VALUES,
  CONTAINER_VOLUME_TYPE_VALUES,
  InitContainerVolumeLink,
  InstanceCommonConfigDetails,
  mergeConfigs,
  VolumeType,
} from '@app/models/container'
import { toNumber } from '@app/utils'
import useTranslation from 'next-translate/useTranslation'
import { v4 as uuid } from 'uuid'
import { ValidationError } from 'yup'
import ConfigSectionLabel from './config-section-label'
import ExtendableItemList from './extendable-item-list'

type CommonConfigSectionBaseProps<T> = {
  disabled?: boolean
  selectedFilters: ImageConfigProperty[]
  editorOptions: ItemEditorState
  config: T
  onChange: (config: Partial<T>) => void
  onResetSection: (section: CommonConfigProperty) => void
  fieldErrors: ValidationError[]
  definedSecrets?: string[]
  publicKey?: string
}

type ImageCommonConfigSectionProps = CommonConfigSectionBaseProps<CommonConfigDetails> & {
  configType: 'image'
}

type InstanceCommonConfigSectionProps = CommonConfigSectionBaseProps<InstanceCommonConfigDetails> & {
  configType: 'instance'
  imageConfig: ContainerConfigData
}

type CommonConfigSectionProps = ImageCommonConfigSectionProps | InstanceCommonConfigSectionProps

const CommonConfigSection = (props: CommonConfigSectionProps) => {
  const { t } = useTranslation('container')
  const {
    disabled,
    onChange,
    onResetSection,
    selectedFilters,
    editorOptions,
    fieldErrors,
    configType,
    definedSecrets,
    publicKey,
    config: propsConfig,
  } = props

  const disabledOnImage = configType === 'image' || disabled
  // eslint-disable-next-line react/destructuring-assignment
  const imageConfig = configType === 'instance' ? props.imageConfig : null
  const resetableConfig = propsConfig
  const config = configType === 'instance' ? mergeConfigs(imageConfig, propsConfig) : propsConfig

  return !filterEmpty([...COMMON_CONFIG_PROPERTIES], selectedFilters) ? null : (
    <div className="my-4">
      <DyoHeading className="text-lg text-bright font-semibold tracking-wide bg-dyo-orange/50 w-40 rounded-t-lg text-center pt-[2px]">
        {t('base.common').toUpperCase()}
      </DyoHeading>

      <div className="flex flex-col border-2 rounded-lg rounded-tl-[0px] border-solid border-dyo-orange/50 p-8 w-full">
        <div className="columns-1 lg:columns-2 2xl:columns-3 gap-x-20">
          {/* name */}
          {filterContains('name', selectedFilters) && (
            <div className="grid break-inside-avoid mb-4">
              <div className="flex flex-row gap-4 items-center">
                <ConfigSectionLabel
                  disabled={disabledOnImage || config.name === imageConfig?.name}
                  onResetSection={() => onResetSection('name')}
                >
                  {t('common.containerName').toUpperCase()}
                </ConfigSectionLabel>

                <MultiInput
                  id="common.containerName"
                  containerClassName="max-w-lg mb-3"
                  labelClassName="text-bright font-semibold tracking-wide mb-2 my-auto mr-4"
                  grow
                  value={config.name ?? ''}
                  placeholder={t('common.containerName')}
                  onPatch={it => onChange({ name: it })}
                  editorOptions={editorOptions}
                  message={fieldErrors.find(it => it.path?.startsWith('name'))?.message}
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          {/* user */}
          {filterContains('user', selectedFilters) && (
            <div className="grid break-inside-avoid mb-8">
              <div className="flex flex-row gap-4 items-start">
                <ConfigSectionLabel
                  className="mt-2.5"
                  disabled={disabled || !resetableConfig.user}
                  onResetSection={() => onResetSection('user')}
                >
                  {t('common.user').toUpperCase()}
                </ConfigSectionLabel>

                <MultiInput
                  id="common.user"
                  containerClassName="max-w-lg mb-3"
                  labelClassName="text-bright font-semibold tracking-wide mb-2 my-auto mr-4"
                  grow
                  value={config.user ?? ''}
                  placeholder={t('common.placeholders.userIdNumber')}
                  onPatch={it => onChange({ user: toNumber(it) })}
                  editorOptions={editorOptions}
                  message={fieldErrors.find(it => it.path?.startsWith('user'))?.message}
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          {/* expose */}
          {filterContains('expose', selectedFilters) && (
            <div className="grid break-inside-avoid mb-8">
              <ConfigSectionLabel
                disabled={disabledOnImage || !resetableConfig?.expose}
                onResetSection={() => onResetSection('expose')}
              >
                {t('common.exposeStrategy').toUpperCase()}
              </ConfigSectionLabel>

              <DyoChips
                className="ml-2"
                choices={CONTAINER_EXPOSE_STRATEGY_VALUES}
                selection={config.expose}
                converter={(it: ContainerConfigExposeStrategy) => t(`common.exposeStrategies.${it}`)}
                onSelectionChange={it => onChange({ expose: it })}
                disabled={disabled}
              />
            </div>
          )}

          {/* tty */}
          {filterContains('tty', selectedFilters) && (
            <div className="flex flex-row break-inside-avoid mb-8">
              <ConfigSectionLabel
                disabled={disabledOnImage || resetableConfig.tty === null}
                onResetSection={() => onResetSection('tty')}
              >
                {t('common.tty').toUpperCase()}
              </ConfigSectionLabel>

              <DyoSwitch
                className="ml-2"
                fieldName="tty"
                checked={config.tty}
                disabled={disabled}
                onCheckedChange={it => onChange({ tty: it })}
              />
            </div>
          )}

          {/* configContainer */}
          {filterContains('configContainer', selectedFilters) && (
            <div className="grid break-inside-avoid mb-8">
              <ConfigSectionLabel
                disabled={disabled || !resetableConfig.configContainer}
                onResetSection={() => onResetSection('configContainer')}
              >
                {t('common.configContainer').toUpperCase()}
              </ConfigSectionLabel>

              <div className="ml-2">
                <MultiInput
                  id="common.configContainer.image"
                  label={t('common.image')}
                  containerClassName="max-w-lg mb-3"
                  labelClassName="my-auto mr-4 w-40"
                  grow
                  inline
                  value={config.configContainer?.image ?? ''}
                  onPatch={it => onChange({ configContainer: { ...config.configContainer, image: it } })}
                  editorOptions={editorOptions}
                  message={fieldErrors.find(it => it.path?.startsWith('configContainer.image'))?.message}
                  disabled={disabled}
                />

                <MultiInput
                  id="common.configContainer.volume"
                  label={t('common.volume')}
                  containerClassName="max-w-lg mb-3"
                  labelClassName="my-auto mr-4 w-40"
                  grow
                  inline
                  value={config.configContainer?.volume ?? ''}
                  onPatch={it => onChange({ configContainer: { ...config.configContainer, volume: it } })}
                  editorOptions={editorOptions}
                  message={fieldErrors.find(it => it.path?.startsWith('configContainer.volume'))?.message}
                  disabled={disabled}
                />

                <MultiInput
                  id="common.configContainer.path"
                  label={t('common.path')}
                  containerClassName="max-w-lg mb-3"
                  labelClassName="my-auto mr-4 w-40"
                  grow
                  inline
                  value={config.configContainer?.path ?? ''}
                  onPatch={it => onChange({ configContainer: { ...config.configContainer, path: it } })}
                  editorOptions={editorOptions}
                  message={fieldErrors.find(it => it.path?.startsWith('configContainer.path'))?.message}
                  disabled={disabled}
                />

                <div className="flex flex-row break-inside-avoid mb-8">
                  <DyoLabel className="my-auto mr-12">{t('common.keepFiles')}</DyoLabel>

                  <DyoSwitch
                    fieldName="configContainer.keepFiles"
                    checked={config.configContainer?.keepFiles}
                    onCheckedChange={it => onChange({ configContainer: { ...config.configContainer, keepFiles: it } })}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ingress */}
          {filterContains('ingress', selectedFilters) && (
            <div className="grid break-inside-avoid mb-8">
              <ConfigSectionLabel
                disabled={disabled || !resetableConfig.ingress}
                onResetSection={() => onResetSection('ingress')}
              >
                {t('common.ingress').toUpperCase()}
              </ConfigSectionLabel>

              <div className="ml-2">
                <MultiInput
                  id="common.ingressName"
                  label={t('common.ingressName')}
                  containerClassName="max-w-lg mb-3"
                  labelClassName="my-auto mr-4 w-40"
                  grow
                  inline
                  value={config.ingress?.name ?? ''}
                  placeholder={t('common.placeholders.ingressName')}
                  onPatch={it => onChange({ ingress: { ...config.ingress, name: it } })}
                  editorOptions={editorOptions}
                  message={fieldErrors.find(it => it.path?.startsWith('ingress.name'))?.message}
                  disabled={disabled}
                />

                <MultiInput
                  id="common.ingressHost"
                  label={t('common.ingressHost')}
                  containerClassName="max-w-lg mb-3"
                  labelClassName="my-auto mr-4 w-40"
                  grow
                  inline
                  value={config.ingress?.host ?? ''}
                  placeholder={t('common.placeholders.ingressHost')}
                  onPatch={it => onChange({ ingress: { ...config.ingress, host: it } })}
                  editorOptions={editorOptions}
                  message={fieldErrors.find(it => it.path?.startsWith('ingress.host'))?.message}
                  disabled={disabled}
                />

                <MultiInput
                  id="common.ingressUploadLimit"
                  label={t('common.ingressUploadLimit')}
                  containerClassName="max-w-lg mb-3"
                  labelClassName="my-auto mr-4 w-40"
                  grow
                  inline
                  value={config.ingress?.uploadLimit ?? ''}
                  placeholder={t('common.placeholders.ingressUploadLimit')}
                  onPatch={it => onChange({ ingress: { ...config.ingress, uploadLimit: it } })}
                  editorOptions={editorOptions}
                  disabled={disabled}
                />
              </div>
            </div>
          )}

          {/* environment */}
          {filterContains('environment', selectedFilters) && (
            <div className="grid mb-8 break-inside-avoid">
              <KeyValueInput
                className="max-h-128 overflow-y-auto"
                labelClassName="text-bright font-semibold tracking-wide mb-2"
                label={t('common.environment').toUpperCase()}
                onChange={it => onChange({ environment: it })}
                onResetSection={resetableConfig.environment ? () => onResetSection('environment') : null}
                items={config.environment}
                editorOptions={editorOptions}
                disabled={disabled}
              />
            </div>
          )}

          {/* secrets */}
          {filterContains('secrets', selectedFilters) && (
            <div className="grid break-inside-avoid mb-8 max-w-lg">
              {configType === 'instance' ? (
                <SecretKeyValueInput
                  className="max-h-128 overflow-y-auto mb-2"
                  keyPlaceholder={t('common.secrets').toUpperCase()}
                  labelClassName="text-bright font-semibold tracking-wide mb-2"
                  label={t('common.secrets').toUpperCase()}
                  onSubmit={it => onChange({ secrets: it })}
                  items={propsConfig.secrets}
                  editorOptions={editorOptions}
                  definedSecrets={definedSecrets}
                  publicKey={publicKey}
                  disabled={disabled}
                />
              ) : (
                <SecretKeyInput
                  className="max-h-128 overflow-y-auto mb-2"
                  keyPlaceholder={t('common.secrets').toUpperCase()}
                  labelClassName="text-bright font-semibold tracking-wide mb-2"
                  label={t('common.secrets').toUpperCase()}
                  onChange={it => onChange({ secrets: it.map(sit => ({ ...sit })) })}
                  onResetSection={resetableConfig.secrets ? () => onResetSection('secrets') : null}
                  items={config.secrets}
                  editorOptions={editorOptions}
                  disabled={disabled}
                />
              )}
            </div>
          )}

          {/* args */}
          {filterContains('args', selectedFilters) && (
            <div className="grid break-inside-avoid mb-8 max-w-lg">
              <KeyOnlyInput
                className="max-h-128 overflow-y-auto mb-2"
                keyPlaceholder={t('common.arguments')}
                label={t('common.arguments').toUpperCase()}
                labelClassName="text-bright font-semibold tracking-wide mb-2"
                onChange={it => onChange({ args: it })}
                onResetSection={resetableConfig.args ? () => onResetSection('args') : null}
                items={config.args}
                editorOptions={editorOptions}
                disabled={disabled}
              />
            </div>
          )}

          {/* commands */}
          {filterContains('commands', selectedFilters) && (
            <div className="grid break-inside-avoid mb-8 max-w-lg">
              <KeyOnlyInput
                className="max-h-128 overflow-y-auto mb-2"
                keyPlaceholder={t('common.commands')}
                label={t('common.commands').toUpperCase()}
                labelClassName="text-bright font-semibold tracking-wide mb-2"
                onChange={it => onChange({ commands: it })}
                onResetSection={resetableConfig.commands ? () => onResetSection('commands') : null}
                items={config.commands}
                editorOptions={editorOptions}
                disabled={disabled}
              />
            </div>
          )}

          {/* importContainer */}
          {filterContains('importContainer', selectedFilters) && (
            <div className="grid mb-8 break-inside-avoid">
              <ConfigSectionLabel
                disabled={disabled || !resetableConfig.importContainer}
                onResetSection={() => onResetSection('importContainer')}
              >
                {t('common.importContainer').toUpperCase()}
              </ConfigSectionLabel>

              <div className="ml-2">
                <MultiInput
                  id="common.importContainer.volume"
                  label={t('common.volume')}
                  containerClassName="max-w-lg mb-3"
                  labelClassName="my-auto mr-2 w-40"
                  className="w-full"
                  grow
                  inline
                  value={config.importContainer?.volume ?? ''}
                  placeholder={t('common.volume')}
                  onPatch={it => onChange({ importContainer: { ...config.importContainer, volume: it } })}
                  editorOptions={editorOptions}
                  message={fieldErrors.find(it => it.path?.startsWith('importContainer.volume'))?.message}
                  disabled={disabled}
                />

                <MultiInput
                  id="common.importContainer.command"
                  label={t('common.command')}
                  containerClassName="max-w-lg mb-3"
                  labelClassName="my-auto mr-2 w-40"
                  className="w-full"
                  grow
                  inline
                  value={config.importContainer?.command ?? ''}
                  placeholder={t('common.command')}
                  onPatch={it => onChange({ importContainer: { ...config.importContainer, command: it } })}
                  editorOptions={editorOptions}
                  disabled={disabled}
                />

                <div className="flex flex-col">
                  <KeyValueInput
                    className="max-h-128 overflow-y-auto"
                    labelClassName=""
                    label={t('common.environment')}
                    onChange={it => onChange({ importContainer: { ...config.importContainer, environment: it } })}
                    items={config.importContainer?.environment}
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ports */}
        {filterContains('ports', selectedFilters) && (
          <ExtendableItemList
            disabled={disabled}
            items={config.ports}
            label={t('common.ports')}
            onPatch={it => onChange({ ports: it })}
            onResetSection={resetableConfig.ports ? () => onResetSection('ports') : null}
            findErrorMessage={index => fieldErrors.find(it => it.path?.startsWith(`ports[${index}]`))?.message}
            emptyItemFactory={() => ({
              external: null,
              internal: null,
            })}
            renderItem={(item, removeButton, onPatch) => (
              <div className="flex flex-row flex-grow">
                <div className="w-6/12 ml-2">
                  <MultiInput
                    id={`common.ports-${item.id}-internal`}
                    className="w-full mr-2"
                    grow
                    placeholder={t('common.internal')}
                    value={item.internal ?? ''}
                    type="number"
                    onPatch={it =>
                      onPatch({
                        internal: toNumber(it, null),
                      })
                    }
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />
                </div>

                <div className="w-6/12 ml-2 mr-2">
                  <MultiInput
                    id={`common.ports-${item.id}-external`}
                    className="w-full mr-2"
                    grow
                    placeholder={t('common.external')}
                    value={item.external ?? ''}
                    type="number"
                    onPatch={it => {
                      const value = Number.parseInt(it, 10)
                      const external = Number.isNaN(value) ? null : value

                      onPatch({
                        external,
                      })
                    }}
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />
                </div>

                {removeButton()}
              </div>
            )}
          />
        )}

        {/* portRanges */}
        {filterContains('portRanges', selectedFilters) && (
          <ExtendableItemList
            disabled={disabled}
            items={config.portRanges}
            label={t('common.portRanges')}
            emptyItemFactory={() => ({
              external: { from: null, to: null },
              internal: { from: null, to: null },
            })}
            findErrorMessage={index => fieldErrors.find(it => it.path?.startsWith(`portRanges[${index}]`))?.message}
            onPatch={it => onChange({ portRanges: it })}
            onResetSection={resetableConfig.portRanges ? () => onResetSection('portRanges') : null}
            renderItem={(item, removeButton, onPatch) => (
              <div className="flex flex-col gap-2">
                <DyoLabel>{t('common.internal').toUpperCase()}</DyoLabel>

                <div className="flex flex-row flex-grow gap-2 pl-2">
                  <MultiInput
                    id={`common.portRanges-${item.id}-internal.from`}
                    containerClassName="w-5/12"
                    type="number"
                    grow
                    placeholder={t('common.from')}
                    value={item.internal?.from ?? ''}
                    onPatch={it => onPatch({ ...item, internal: { ...item.internal, from: toNumber(it) } })}
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />

                  <MultiInput
                    id={`common.portRanges-${item.id}-internal.to`}
                    containerClassName="w-7/12"
                    type="number"
                    grow
                    placeholder={t('common.to')}
                    value={item?.internal?.to ?? ''}
                    onPatch={it => onPatch({ ...item, internal: { ...item.internal, to: toNumber(it) } })}
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />
                </div>

                {/* external part */}
                <DyoLabel>{t('common.external').toUpperCase()}</DyoLabel>

                <div className="flex flex-row flex-grow gap-2 pl-2">
                  <MultiInput
                    id={`common.portRanges-${item.id}-external.from`}
                    containerClassName="w-5/12"
                    type="number"
                    grow
                    placeholder={t('common.from')}
                    value={item?.external?.from ?? ''}
                    onPatch={it => onPatch({ ...item, external: { ...item.external, from: toNumber(it) } })}
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />

                  <MultiInput
                    id={`common.portRanges-${item.id}-external.to`}
                    containerClassName="w-7/12"
                    type="number"
                    grow
                    placeholder={t('common.to')}
                    value={item?.external?.to ?? ''}
                    onPatch={it => onPatch({ ...item, external: { ...item.external, to: toNumber(it) } })}
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />

                  {removeButton()}
                </div>
              </div>
            )}
          />
        )}

        {/* volumes */}
        {filterContains('volumes', selectedFilters) && (
          <ExtendableItemList
            disabled={disabled}
            items={config.volumes}
            label={t('common.volumes')}
            itemClassName="grid grid-cols-1 xl:grid-cols-2 grid-flow-column ml-2 gap-x-20 gap-y-14 mb-8"
            emptyItemFactory={() => ({
              name: null,
              path: null,
              type: 'rwo' as VolumeType,
            })}
            findErrorMessage={index => fieldErrors.find(it => it.path?.startsWith(`volumes[${index}]`))?.message}
            onPatch={it => onChange({ volumes: it })}
            onResetSection={resetableConfig.volumes ? () => onResetSection('volumes') : null}
            renderItem={(item, removeButton, onPatch) => (
              <div className="grid break-inside-avoid">
                <div className="flex flex-row">
                  <MultiInput
                    id={`common.volumes-${item.id}-name`}
                    label={t('common:name')}
                    containerClassName="basis-2/3"
                    labelClassName="my-auto mr-4"
                    grow
                    inline
                    value={item.name ?? ''}
                    onPatch={it => onPatch({ name: it })}
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />

                  <MultiInput
                    id={`common.volumes-${item.id}-size`}
                    label={t('common.size')}
                    containerClassName="basis-1/3 ml-4"
                    labelClassName="my-auto mr-4"
                    grow
                    inline
                    value={item.size ?? ''}
                    onPatch={it => onPatch({ size: it })}
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />
                </div>

                <div className="flex flex-row my-4">
                  <MultiInput
                    id={`common.volumes-${item.id}-path`}
                    label={t('common.path')}
                    containerClassName="basis-1/2"
                    labelClassName="my-auto mr-7"
                    grow
                    inline
                    value={item.path ?? ''}
                    onPatch={it => onPatch({ path: it })}
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />

                  <MultiInput
                    id={`common.volumes-${item.id}-class`}
                    label={t('common.class')}
                    containerClassName="basis-1/2 ml-4"
                    labelClassName="my-auto mr-4"
                    grow
                    inline
                    value={item.class ?? ''}
                    onPatch={it => onPatch({ class: it })}
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />
                </div>

                <div className="flex flex-row justify-between">
                  <div className="flex flex-col flex-grow">
                    <DyoLabel className="my-auto mr-4">{t('common.type')}</DyoLabel>

                    <div className="flex flex-row">
                      <DyoChips
                        choices={CONTAINER_VOLUME_TYPE_VALUES}
                        selection={item.type}
                        converter={(it: VolumeType) => t(`common.volumeTypes.${it}`)}
                        onSelectionChange={it => onPatch({ type: it })}
                        disabled={disabled}
                      />

                      {removeButton('self-center ml-auto')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
        )}

        {/* initContainers */}
        {filterContains('initContainers', selectedFilters) && (
          <ExtendableItemList
            disabled={disabled}
            items={config.initContainers}
            label={t('common.initContainers')}
            emptyItemFactory={() => ({
              id: uuid(),
              name: null,
              image: null,
              args: [],
              command: [],
              environment: [],
              volumes: [],
              useParentConfig: false,
            })}
            findErrorMessage={index => fieldErrors.find(it => it.path?.startsWith(`initContainers[${index}]`))?.message}
            onPatch={it => onChange({ initContainers: it })}
            onResetSection={resetableConfig.initContainers ? () => onResetSection('initContainers') : null}
            renderItem={(item, removeButton, onPatch) => (
              <div className="grid">
                <MultiInput
                  id={`common.initContainers-${item.id}-name`}
                  label={t('common:name').toUpperCase()}
                  containerClassName="max-w-lg mb-3"
                  labelClassName="my-auto mr-2 w-20"
                  grow
                  inline
                  value={item.name ?? ''}
                  onPatch={it => onPatch({ name: it })}
                  editorOptions={editorOptions}
                  disabled={disabled}
                />

                <MultiInput
                  id={`common.initContainers-${item.id}-image`}
                  label={t('common.image').toUpperCase()}
                  containerClassName="max-w-lg mb-3"
                  labelClassName="my-auto mr-2 w-20"
                  grow
                  inline
                  value={item.image ?? ''}
                  onPatch={it => onPatch({ image: it })}
                  editorOptions={editorOptions}
                  disabled={disabled}
                />

                <div className="flex flex-col mb-2">
                  <DyoLabel className="mb-2">{t('common.volumes').toUpperCase()}</DyoLabel>

                  <KeyValueInput
                    className="w-full max-h-128 overflow-y-auto"
                    keyPlaceholder={t('common.name')}
                    valuePlaceholder={t('common.path')}
                    items={item.volumes?.map(it => ({ id: it.id, key: it.name, value: it.path }))}
                    onChange={it => {
                      const volumes = it.map(i => ({ id: i.id, name: i.key, path: i.value } as InitContainerVolumeLink))
                      onPatch({ volumes })
                    }}
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />
                </div>

                <div className="flex flex-col mb-2">
                  <DyoLabel className="mb-2">{t('common.arguments').toUpperCase()}</DyoLabel>

                  <KeyOnlyInput
                    className="max-h-128 overflow-y-auto"
                    keyPlaceholder={t('common.arguments')}
                    onChange={it => onPatch({ args: it })}
                    items={item.args}
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />
                </div>

                <div className="flex flex-col mb-2">
                  <DyoLabel className="mb-2">{t('common.command').toUpperCase()}</DyoLabel>

                  <KeyOnlyInput
                    className="max-h-128 overflow-y-auto"
                    keyPlaceholder={t('common.command')}
                    onChange={it => onPatch({ command: it })}
                    items={item.command}
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />
                </div>

                <div className="flex flex-col mb-2">
                  <DyoLabel className="mb-2">{t('common.environment').toUpperCase()}</DyoLabel>

                  <KeyValueInput
                    className="max-h-128 overflow-y-auto"
                    onChange={it => onPatch({ environment: it })}
                    items={item.environment}
                    editorOptions={editorOptions}
                    disabled={disabled}
                  />
                </div>

                <div className="flex flex-row justify-between">
                  <div className="flex flex-row">
                    <DyoLabel className="my-auto mr-4">{t('common.useParent').toLocaleUpperCase()}</DyoLabel>

                    <DyoSwitch
                      checked={item.useParentConfig}
                      onCheckedChange={it => onPatch({ useParentConfig: it })}
                      disabled={disabled}
                    />
                  </div>

                  {removeButton()}
                </div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  )
}

export default CommonConfigSection
