import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_} from "typeorm"

@Entity_()
export class ProjectAttestation {
    constructor(props?: Partial<ProjectAttestation>) {
        Object.assign(this, props)
    }

    /**
     * UID of the attestation
     */
    @PrimaryColumn_()
    id!: string

    @Column_("text", {nullable: false})
    attester!: string

    @Column_("bool", {nullable: false})
    value!: boolean

    @Column_("text", {nullable: false})
    organization!: string

    @Column_("text", {nullable: false})
    txHash!: string

    @Column_("bool", {nullable: false})
    revoked!: boolean
}
