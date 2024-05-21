import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_, OneToMany as OneToMany_} from "typeorm"
import {ProjectAttestation} from "./projectAttestation.model"
import {OrganisationProject} from "./organisationProject.model"

@Entity_()
export class Project {
    constructor(props?: Partial<Project>) {
        Object.assign(this, props)
    }

    /**
     * Project Source and Project ID separated by a hyphen
     */
    @PrimaryColumn_()
    id!: string

    /**
     * Source of the project
     */
    @Index_()
    @Column_("text", {nullable: false})
    source!: string

    /**
     * Project ID. Unique within the source
     */
    @Index_()
    @Column_("text", {nullable: false})
    projectId!: string

    /**
     * Title of the project
     */
    @Column_("text", {nullable: true})
    title!: string | undefined | null

    /**
     * Description of the project
     */
    @Column_("text", {nullable: true})
    description!: string | undefined | null

    /**
     * Total attests with value True
     */
    @Column_("int4", {nullable: false})
    totalVouches!: number

    /**
     * Total attests with value False
     */
    @Column_("int4", {nullable: false})
    totalFlags!: number

    /**
     * Total attests
     */
    @Column_("int4", {nullable: false})
    totalAttests!: number

    /**
     * Slug of the project
     */
    @Column_("text", {nullable: true})
    slug!: string | undefined | null

    /**
     * Image of the project
     */
    @Column_("text", {nullable: true})
    image!: string | undefined | null

    @Column_("timestamp with time zone", {nullable: false})
    lastUpdatedTimestamp!: Date

    @OneToMany_(() => ProjectAttestation, e => e.project)
    attests!: ProjectAttestation[]

    @OneToMany_(() => OrganisationProject, e => e.project)
    attestedOrganisations!: OrganisationProject[]
}
