import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import {Attester} from "./attester.model"
import {Organisation} from "./organisation.model"

@Entity_()
export class AttesterOrganisation {
    constructor(props?: Partial<AttesterOrganisation>) {
        Object.assign(this, props)
    }

    /**
     * UID of the attestation made the relationship
     */
    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Attester, {nullable: true})
    attester!: Attester

    @Index_()
    @ManyToOne_(() => Organisation, {nullable: true})
    organisation!: Organisation

    /**
     * Timestamp at which the relationship was created
     */
    @Column_("timestamp with time zone", {nullable: false})
    attestTimestamp!: Date

    @Column_("bool", {nullable: false})
    revoked!: boolean
}
