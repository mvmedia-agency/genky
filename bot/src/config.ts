import { z } from "zod"

export const configValidator = z.record(z.object({
    username: z.string(),
    password: z.string(),
    email: z.string(),
    emailPassword: z.string(),
    additional: z.string()
}));

export type AccountConfig = z.infer<typeof configValidator>;

const config: AccountConfig = {
    "1337": {
        username: "meikel",
        password: "meikelspassword",
        email: "meikelsmail@mail.com",
        emailPassword: "meikelsemailpasswort",
        additional: "E-Mail Service: https://login.one.com/mail"
    },
    "1227": {
        username: "moris",
        password: "morissespasswort",
        email: "mail@mvmo.dev",
        emailPassword: "morissespasswortfuermail",
        additional: "E-Mail Service: https://login.one.com/mail"
    }
}

export default configValidator.parse(config);
