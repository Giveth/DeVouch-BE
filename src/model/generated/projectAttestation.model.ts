import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import {AttestorOrganisation} from "./attestorOrganisation.model"
import {Project} from "./project.model"

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
    recipient!: string

    @Column_("bool", {nullable: false})
    vouchOrFlag!: boolean

    @Column_("text", {nullable: false})
    txHash!: string

    @Column_("bool", {nullable: false})
    revoked!: boolean

    @Index_()
    @ManyToOne_(() => AttestorOrganisation, {nullable: true})
    attestorOrganisation!: AttestorOrganisation

    @Index_()
    @ManyToOne_(() => Project, {nullable: true})
    project!: Project

    @Column_("timestamp with time zone", {nullable: false})
    attestTimestamp!: Date

    @Column_("text", {nullable: true})
    comment!: string | undefined | null
}
