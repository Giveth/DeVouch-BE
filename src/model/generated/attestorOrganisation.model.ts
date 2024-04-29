import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import {Attestor} from "./attestor.model"
import {Organisation} from "./organisation.model"

@Entity_()
export class AttestorOrganisation {
    constructor(props?: Partial<AttestorOrganisation>) {
        Object.assign(this, props)
    }

    /**
     * UID of the attestation made the relationship
     */
    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Attestor, {nullable: true})
    attestor!: Attestor

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
