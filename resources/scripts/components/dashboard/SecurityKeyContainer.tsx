import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Form, Formik, FormikHelpers } from 'formik';
import tw from 'twin.macro';
import { object, string } from 'yup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFingerprint, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import deleteWebauthnKey from '@/api/account/webauthn/deleteSecurityKey';
import { SecurityKey } from '@/api/account/webauthn/getSecurityKeys';
import registerSecurityKey from '@/api/account/webauthn/registerSecurityKey';
import FlashMessageRender from '@/components/FlashMessageRender';
import Button from '@/components/elements/Button';
import ContentBox from '@/components/elements/ContentBox';
import Field from '@/components/elements/Field';
import GreyRowBox from '@/components/elements/GreyRowBox';
import PageContentBlock from '@/components/elements/PageContentBlock';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import useFlash, { useFlashKey } from '@/plugins/useFlash';
import ConfirmationModal from '@/components/elements/ConfirmationModal';
import { useSecurityKeys } from '@/api/account/webauthn/security-keys';

interface Values {
    name: string;
}

const AddSecurityKeyForm = ({ onKeyAdded }: { onKeyAdded: (key: SecurityKey) => void }) => {
    const { clearFlashes, clearAndAddHttpError } = useFlash();

    const submit = ({ name }: Values, { setSubmitting, resetForm }: FormikHelpers<Values>) => {
        clearFlashes('security_keys');

        registerSecurityKey(name)
            .then(key => {
                resetForm();
                onKeyAdded(key);
            })
            .catch(err => {
                console.error(err);
                clearAndAddHttpError({ key: 'security_keys', error: err });
            })
            .then(() => setSubmitting(false));
    };

    return (
        <Formik
            onSubmit={submit}
            initialValues={{ name: '' }}
            validationSchema={object().shape({
                name: string().required(),
            })}
        >
            {({ isSubmitting }) => (
                <Form>
                    <SpinnerOverlay visible={isSubmitting}/>
                    <Field
                        type={'text'}
                        id={'name'}
                        name={'name'}
                        label={'Name'}
                        description={'A descriptive name for this security key.'}
                    />
                    <div css={tw`flex justify-end mt-6`}>
                        <Button>Create</Button>
                    </div>
                </Form>
            )}
        </Formik>
    );
};

export default () => {
    const { clearFlashes, clearAndAddHttpError } = useFlashKey('security_keys');

    const [ deleteId, setDeleteId ] = useState<string | null>(null);
    const { data, mutate, error } = useSecurityKeys({ revalidateOnFocus: false });

    const doDeletion = () => {
        const uuid = deleteId;

        setDeleteId(null);
        clearFlashes();
        mutate(keys => !keys ? undefined : keys.filter(key => key.uuid !== deleteId));

        if (!uuid) return;

        deleteWebauthnKey(uuid).catch(error => {
            clearAndAddHttpError(error);
            mutate();
        });
    };

    useEffect(() => {
        clearAndAddHttpError(error);
    }, [ error ]);

    return (
        <PageContentBlock title={'Security Keys'}>
            <FlashMessageRender byKey={'security_keys'}/>
            <div css={tw`md:flex flex-nowrap my-10`}>
                <ContentBox title={'Add Security Key'} css={tw`flex-1 md:mr-8`}>
                    <AddSecurityKeyForm onKeyAdded={key => mutate((keys) => (keys || []).concat(key))}/>
                </ContentBox>
                <ContentBox title={'Security Keys'} css={tw`flex-none w-full mt-8 md:mt-0 md:w-1/2`}>
                    <ConfirmationModal
                        visible={!!deleteId}
                        title={'Confirm key deletion'}
                        buttonText={'Yes, Delete Key'}
                        onConfirmed={doDeletion}
                        onModalDismissed={() => setDeleteId(null)}
                    >
                        Are you sure you wish to delete this security key?
                        You will no longer be able to authenticate using this key.
                    </ConfirmationModal>
                    {!data ?
                        <SpinnerOverlay visible/>
                        :
                        data?.length === 0 ?
                            <p css={tw`text-center text-sm`}>
                                No security keys have been configured for this account.
                            </p>
                            :
                            data.map((key, index) => (
                                <GreyRowBox
                                    key={index}
                                    css={[ tw`bg-neutral-600 flex items-center`, index > 0 && tw`mt-2` ]}
                                >
                                    <FontAwesomeIcon icon={faFingerprint} css={tw`text-neutral-300`}/>
                                    <div css={tw`ml-4 flex-1 overflow-hidden`}>
                                        <p css={tw`text-sm break-words`}>{key.name}</p>
                                        <p css={tw`text-2xs text-neutral-300 uppercase`}>
                                            Created at:&nbsp;
                                            {key.createdAt ? format(key.createdAt, 'MMM do, yyyy HH:mm') : 'Never'}
                                        </p>
                                    </div>
                                    <button css={tw`ml-4 p-2 text-sm`} onClick={() => setDeleteId(key.uuid)}>
                                        <FontAwesomeIcon
                                            icon={faTrashAlt}
                                            css={tw`text-neutral-400 hover:text-red-400 transition-colors duration-150`}
                                        />
                                    </button>
                                </GreyRowBox>
                            ))
                    }
                </ContentBox>
            </div>
        </PageContentBlock>
    );
};
