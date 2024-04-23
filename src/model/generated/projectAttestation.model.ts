import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import {AttesterOrganisation} from "./attesterOrganisation.model"
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

    @Column_("bool", {nullable: false})
    value!: boolean

    @Column_("text", {nullable: false})
    txHash!: string

    @Column_("bool", {nullable: false})
    revoked!: boolean

    @Index_()
    @ManyToOne_(() => AttesterOrganisation, {nullable: true})
    attesterOrganisation!: AttesterOrganisation

    @Index_()
    @ManyToOne_(() => Project, {nullable: true})
    project!: Project
}
