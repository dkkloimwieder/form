import { createComponent, createContext, omit, useContext } from 'solid-js'
import { createFieldGroup } from './createFieldGroup'
import { createForm } from './createForm'
import { mergeObjects } from './merge-objects'
import type {
  AnyFieldApi,
  AnyFormApi,
  BaseFormOptions,
  DeepKeysOfType,
  FieldApi,
  FieldsMap,
  FormAsyncValidateOrFn,
  FormOptions,
  FormValidateOrFn,
} from '@tanstack/form-core'
import type { Accessor, Component, Context, ParentProps } from 'solid-js'
import type { JSX } from '@solidjs/web'
import type { FieldComponent } from './createField'
import type { AppFieldExtendedSolidFieldGroupApi } from './createFieldGroup'
import type { SolidFormExtendedApi } from './createForm'

/**
 * TypeScript inferencing is weird.
 *
 * If you have:
 *
 * @example
 *
 * interface Args<T> {
 *     arg?: T
 * }
 *
 * function test<T>(arg?: Partial<Args<T>>): T {
 *     return 0 as any;
 * }
 *
 * const a = test({});
 *
 * Then `T` will default to `unknown`.
 *
 * However, if we change `test` to be:
 *
 * @example
 *
 * function test<T extends undefined>(arg?: Partial<Args<T>>): T;
 *
 * Then `T` becomes `undefined`.
 *
 * Here, we are checking if the passed type `T` extends `DefaultT` and **only**
 * `DefaultT`, as if that's the case we assume that inferencing has not occurred.
 */
type UnwrapOrAny<T> = [unknown] extends [T] ? any : T
type UnwrapDefaultOrAny<DefaultT, T> = [DefaultT] extends [T]
  ? [T] extends [DefaultT]
    ? any
    : T
  : T

export function createFormHookContexts() {
  /**
   * The `| null` is honest rather than defensive: `useContext` returns the
   * default when there is no provider above, and the guard below is what turns
   * that into the package's own message.
   *
   * Solid 2's default-less `createContext<T>()` is the idiomatic form and is
   * deliberately NOT used here — it throws `ContextNotFoundError` from
   * `useContext`, which would pre-empt that message with a generic one.
   */
  const fieldContext = createContext<Accessor<AnyFieldApi> | null>(null)

  function useFieldContext<TData>() {
    const field = useContext(fieldContext)

    if (!field) {
      throw new Error(
        '`fieldContext` only works when within a `fieldComponent` passed to `createFormHook`',
      )
    }

    return field as Accessor<
      FieldApi<
        any,
        string,
        TData,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any
      >
    >
  }

  /** See `fieldContext` above for why this is a `| null` union and not a cast. */
  const formContext = createContext<AnyFormApi | null>(null)

  function useFormContext() {
    const form = useContext(formContext)

    if (!form) {
      throw new Error(
        '`formContext` only works when within a `formComponent` passed to `createFormHook`',
      )
    }

    return form as SolidFormExtendedApi<
      // If you need access to the form data, you need to use `withForm` instead
      Record<string, never>,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any
    >
  }

  return { fieldContext, useFieldContext, useFormContext, formContext }
}

interface CreateFormHookProps<
  TFieldComponents extends Record<string, Component<any>>,
  TFormComponents extends Record<string, Component<any>>,
> {
  fieldComponents: TFieldComponents
  fieldContext: Context<Accessor<AnyFieldApi> | null>
  formComponents: TFormComponents
  formContext: Context<AnyFormApi | null>
}
/**
 * @private
 */
export type AppFieldExtendedSolidFormApi<
  TFormData,
  TOnMount extends undefined | FormValidateOrFn<TFormData>,
  TOnChange extends undefined | FormValidateOrFn<TFormData>,
  TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnBlur extends undefined | FormValidateOrFn<TFormData>,
  TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
  TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
  TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
  TSubmitMeta,
  TFieldComponents extends Record<string, Component<any>>,
  TFormComponents extends Record<string, Component<any>>,
> = SolidFormExtendedApi<
  TFormData,
  TOnMount,
  TOnChange,
  TOnChangeAsync,
  TOnBlur,
  TOnBlurAsync,
  TOnSubmit,
  TOnSubmitAsync,
  TOnDynamic,
  TOnDynamicAsync,
  TOnServer,
  TSubmitMeta
> &
  NoInfer<TFormComponents> & {
    AppField: FieldComponent<
      TFormData,
      TOnMount,
      TOnChange,
      TOnChangeAsync,
      TOnBlur,
      TOnBlurAsync,
      TOnSubmit,
      TOnSubmitAsync,
      TOnDynamic,
      TOnDynamicAsync,
      TOnServer,
      TSubmitMeta,
      NoInfer<TFieldComponents>
    >
    AppForm: Component<ParentProps>
  }

export interface WithFormProps<
  TFormData,
  TOnMount extends undefined | FormValidateOrFn<TFormData>,
  TOnChange extends undefined | FormValidateOrFn<TFormData>,
  TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnBlur extends undefined | FormValidateOrFn<TFormData>,
  TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
  TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
  TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
  TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
  TSubmitMeta,
  TFieldComponents extends Record<string, Component<any>>,
  TFormComponents extends Record<string, Component<any>>,
  TRenderProps extends Record<string, unknown> = Record<string, never>,
> extends FormOptions<
  TFormData,
  TOnMount,
  TOnChange,
  TOnChangeAsync,
  TOnBlur,
  TOnBlurAsync,
  TOnSubmit,
  TOnSubmitAsync,
  TOnDynamic,
  TOnDynamicAsync,
  TOnServer,
  TSubmitMeta
> {
  // Optional, but adds props to the `render` function outside of `form`
  props?: TRenderProps
  render: (
    props: ParentProps<
      NoInfer<TRenderProps> & {
        form: AppFieldExtendedSolidFormApi<
          TFormData,
          TOnMount,
          TOnChange,
          TOnChangeAsync,
          TOnBlur,
          TOnBlurAsync,
          TOnSubmit,
          TOnSubmitAsync,
          TOnDynamic,
          TOnDynamicAsync,
          TOnServer,
          TSubmitMeta,
          TFieldComponents,
          TFormComponents
        >
      }
    >,
  ) => JSX.Element
}

export interface WithFieldGroupProps<
  TFieldGroupData,
  TFieldComponents extends Record<string, Component<any>>,
  TFormComponents extends Record<string, Component<any>>,
  TSubmitMeta,
  TRenderProps extends Record<string, unknown> = Record<string, never>,
> extends BaseFormOptions<TFieldGroupData, TSubmitMeta> {
  // Optional, but adds props to the `render` function outside of `form`
  props?: TRenderProps
  render: (
    props: ParentProps<
      NoInfer<TRenderProps> & {
        group: AppFieldExtendedSolidFieldGroupApi<
          unknown,
          TFieldGroupData,
          string | FieldsMap<unknown, TFieldGroupData>,
          undefined | FormValidateOrFn<unknown>,
          undefined | FormValidateOrFn<unknown>,
          undefined | FormAsyncValidateOrFn<unknown>,
          undefined | FormValidateOrFn<unknown>,
          undefined | FormAsyncValidateOrFn<unknown>,
          undefined | FormValidateOrFn<unknown>,
          undefined | FormAsyncValidateOrFn<unknown>,
          undefined | FormValidateOrFn<unknown>,
          undefined | FormAsyncValidateOrFn<unknown>,
          undefined | FormAsyncValidateOrFn<unknown>,
          // this types it as 'never' in the render prop. It should prevent any
          // untyped meta passed to the handleSubmit by accident.
          unknown extends TSubmitMeta ? never : TSubmitMeta,
          TFieldComponents,
          TFormComponents
        >
      }
    >,
  ) => JSX.Element
}

export function createFormHook<
  const TComponents extends Record<string, Component<any>>,
  const TFormComponents extends Record<string, Component<any>>,
>(opts: CreateFormHookProps<TComponents, TFormComponents>) {
  function useAppForm<
    TFormData,
    TOnMount extends undefined | FormValidateOrFn<TFormData>,
    TOnChange extends undefined | FormValidateOrFn<TFormData>,
    TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
    TOnBlur extends undefined | FormValidateOrFn<TFormData>,
    TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
    TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
    TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
    TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
    TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
    TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
    TSubmitMeta,
  >(
    props: Accessor<
      FormOptions<
        TFormData,
        TOnMount,
        TOnChange,
        TOnChangeAsync,
        TOnBlur,
        TOnBlurAsync,
        TOnSubmit,
        TOnSubmitAsync,
        TOnDynamic,
        TOnDynamicAsync,
        TOnServer,
        TSubmitMeta
      >
    >,
  ): AppFieldExtendedSolidFormApi<
    TFormData,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TOnServer,
    TSubmitMeta,
    TComponents,
    TFormComponents
  > {
    const form = createForm(props)

    // A Solid 2 context object IS its provider component — `.Provider` is gone.
    // Left as-is this would compile to `createComponent(undefined, …)`, a
    // runtime crash rather than a type error, because the member access sits on
    // a `Context`.
    const AppForm = ((formProps) => {
      return (
        <opts.formContext value={form}>{formProps.children}</opts.formContext>
      )
    }) as Component<ParentProps>

    const AppField = ((_props) => {
      // `omit` replaces `splitProps`, returning ONLY the rest — a live proxy
      // that preserves per-key tracking, so the spread below stays reactive.
      // The picked half is read straight off `_props`, and reading it inside
      // the children callback rather than in the untracked component body is
      // strictly better than the Solid 1 shape it replaces.
      const fieldProps = omit(_props, 'children')
      return (
        <form.Field {...fieldProps}>
          {(field) => (
            <opts.fieldContext value={field}>
              {createComponent(
                () =>
                  _props.children(Object.assign(field, opts.fieldComponents)),
                {},
              )}
            </opts.fieldContext>
          )}
        </form.Field>
      )
    }) as FieldComponent<
      TFormData,
      TOnMount,
      TOnChange,
      TOnChangeAsync,
      TOnBlur,
      TOnBlurAsync,
      TOnSubmit,
      TOnSubmitAsync,
      TOnDynamic,
      TOnDynamicAsync,
      TOnServer,
      TSubmitMeta,
      TComponents
    >

    const extendedForm: AppFieldExtendedSolidFormApi<
      TFormData,
      TOnMount,
      TOnChange,
      TOnChangeAsync,
      TOnBlur,
      TOnBlurAsync,
      TOnSubmit,
      TOnSubmitAsync,
      TOnDynamic,
      TOnDynamicAsync,
      TOnServer,
      TSubmitMeta,
      TComponents,
      TFormComponents
    > = form as never
    extendedForm.AppField = AppField
    extendedForm.AppForm = AppForm
    for (const [key, value] of Object.entries(opts.formComponents)) {
      // Since it's a generic I need to cast it to an object
      ;(extendedForm as Record<string, any>)[key] = value
    }

    return extendedForm
  }

  function withForm<
    TFormData,
    TOnMount extends undefined | FormValidateOrFn<TFormData>,
    TOnChange extends undefined | FormValidateOrFn<TFormData>,
    TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
    TOnBlur extends undefined | FormValidateOrFn<TFormData>,
    TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
    TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
    TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
    TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
    TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
    TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
    TSubmitMeta,
    TRenderProps extends Record<string, unknown> = {},
  >({
    render,
    props,
  }: WithFormProps<
    TFormData,
    TOnMount,
    TOnChange,
    TOnChangeAsync,
    TOnBlur,
    TOnBlurAsync,
    TOnSubmit,
    TOnSubmitAsync,
    TOnDynamic,
    TOnDynamicAsync,
    TOnServer,
    TSubmitMeta,
    TComponents,
    TFormComponents,
    TRenderProps
  >): WithFormProps<
    UnwrapOrAny<TFormData>,
    UnwrapDefaultOrAny<undefined | FormValidateOrFn<TFormData>, TOnMount>,
    UnwrapDefaultOrAny<undefined | FormValidateOrFn<TFormData>, TOnChange>,
    UnwrapDefaultOrAny<undefined | FormValidateOrFn<TFormData>, TOnChangeAsync>,
    UnwrapDefaultOrAny<undefined | FormValidateOrFn<TFormData>, TOnBlur>,
    UnwrapDefaultOrAny<undefined | FormValidateOrFn<TFormData>, TOnBlurAsync>,
    UnwrapDefaultOrAny<undefined | FormValidateOrFn<TFormData>, TOnSubmit>,
    UnwrapDefaultOrAny<undefined | FormValidateOrFn<TFormData>, TOnSubmitAsync>,
    UnwrapDefaultOrAny<undefined | FormValidateOrFn<TFormData>, TOnDynamic>,
    UnwrapDefaultOrAny<
      undefined | FormValidateOrFn<TFormData>,
      TOnDynamicAsync
    >,
    UnwrapDefaultOrAny<undefined | FormValidateOrFn<TFormData>, TOnServer>,
    UnwrapOrAny<TSubmitMeta>,
    UnwrapOrAny<TComponents>,
    UnwrapOrAny<TFormComponents>,
    UnwrapOrAny<TRenderProps>
  >['render'] {
    // mergeObjects, not Solid 2's `merge`: `merge` resolves a key from the
    // right-most source that HAS it, so a caller-supplied prop that happens to
    // be `undefined` erases the declared default rather than falling through to
    // it. See src/merge-objects.ts.
    return (innerProps) =>
      createComponent(
        render as Component<any>,
        mergeObjects(props ?? {}, innerProps),
      )
  }

  function withFieldGroup<
    TFieldGroupData,
    TSubmitMeta,
    TRenderProps extends Record<string, unknown> = {},
  >({
    render,
    props,
    defaultValues,
  }: WithFieldGroupProps<
    TFieldGroupData,
    TComponents,
    TFormComponents,
    TSubmitMeta,
    TRenderProps
  >): <
    TFormData,
    TFields extends
      | DeepKeysOfType<TFormData, TFieldGroupData | null | undefined>
      | FieldsMap<TFormData, TFieldGroupData>,
    TOnMount extends undefined | FormValidateOrFn<TFormData>,
    TOnChange extends undefined | FormValidateOrFn<TFormData>,
    TOnChangeAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
    TOnBlur extends undefined | FormValidateOrFn<TFormData>,
    TOnBlurAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
    TOnSubmit extends undefined | FormValidateOrFn<TFormData>,
    TOnSubmitAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
    TOnDynamic extends undefined | FormValidateOrFn<TFormData>,
    TOnDynamicAsync extends undefined | FormAsyncValidateOrFn<TFormData>,
    TOnServer extends undefined | FormAsyncValidateOrFn<TFormData>,
    TFormSubmitMeta,
  >(
    params: ParentProps<
      NoInfer<TRenderProps> & {
        form:
          | AppFieldExtendedSolidFormApi<
              TFormData,
              TOnMount,
              TOnChange,
              TOnChangeAsync,
              TOnBlur,
              TOnBlurAsync,
              TOnSubmit,
              TOnSubmitAsync,
              TOnDynamic,
              TOnDynamicAsync,
              TOnServer,
              unknown extends TSubmitMeta ? TFormSubmitMeta : TSubmitMeta,
              TComponents,
              TFormComponents
            >
          | AppFieldExtendedSolidFieldGroupApi<
              // Since this only occurs if you nest it within other field groups, it can be more
              // lenient with the types.
              unknown,
              TFormData,
              string | FieldsMap<unknown, TFormData>,
              any,
              any,
              any,
              any,
              any,
              any,
              any,
              any,
              any,
              any,
              unknown extends TSubmitMeta ? TFormSubmitMeta : TSubmitMeta,
              TComponents,
              TFormComponents
            >
        fields: TFields
      }
    >,
  ) => JSX.Element {
    return function Render(innerProps) {
      // Getters, not eager reads: a component body is untracked, so reading
      // `innerProps.form` here was one [STRICT_READ_UNTRACKED] per render. This
      // does not make the group reactive — `createFieldGroup` has no options
      // push loop — but the object stays live for FieldGroupApi's own later
      // reads, and the diagnostic goes quiet.
      const fieldGroupProps = {
        get form() {
          return innerProps.form
        },
        get fields() {
          return innerProps.fields
        },
        defaultValues,
        formComponents: opts.formComponents,
      }
      const fieldGroupApi = createFieldGroup(() => fieldGroupProps)
      return createComponent(
        render as Component<any>,
        mergeObjects(props ?? {}, innerProps, { group: fieldGroupApi as any }),
      )
    }
  }

  return {
    useAppForm,
    withForm,
    withFieldGroup,
  }
}
