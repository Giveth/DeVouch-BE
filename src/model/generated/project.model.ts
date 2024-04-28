import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToMany as OneToMany_} from "typeorm"
import {ProjectAttestation} from "./projectAttestation.model"

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
    @Column_("text", {nullable: false})
    source!: string

    /**
     * Project ID. Unique within the source
     */
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

    @Column_("timestamp with time zone", {nullable: false})
    lastUpdatedTimestamp!: Date

    @OneToMany_(() => ProjectAttestation, e => e.project)
    attests!: ProjectAttestation[]
}
