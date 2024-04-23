import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToMany as OneToMany_} from "typeorm"
import {ProjectAttestation} from "./projectAttestation.model"

@Entity_()
export class Project {
    constructor(props?: Partial<Project>) {
        Object.assign(this, props)
    }

    /**
     * Project ID
     */
    @PrimaryColumn_()
    id!: string

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
