import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, OneToMany as OneToMany_} from "typeorm"
import {AttestorOrganisation} from "./attestorOrganisation.model"
import {OrganisationProject} from "./organisationProject.model"

@Entity_()
export class Organisation {
    constructor(props?: Partial<Organisation>) {
        Object.assign(this, props)
    }

    /**
     * Organization schema UID
     */
    @PrimaryColumn_()
    id!: string

    /**
     * Organization Name
     */
    @Index_({unique: true})
    @Column_("text", {nullable: false})
    name!: string

    /**
     * Issuing authority address
     */
    @Column_("text", {nullable: false})
    issuer!: string

    /**
     * Color of the organization
     */
    @Column_("text", {nullable: true})
    color!: string | undefined | null

    /**
     * Organization Attestors
     */
    @OneToMany_(() => AttestorOrganisation, e => e.organisation)
    attestors!: AttestorOrganisation[]

    @OneToMany_(() => OrganisationProject, e => e.organisation)
    attestedProjects!: OrganisationProject[]
}
