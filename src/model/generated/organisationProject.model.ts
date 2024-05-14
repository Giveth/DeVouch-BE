import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import {Organisation} from "./organisation.model"
import {Project} from "./project.model"

@Entity_()
export class OrganisationProject {
    constructor(props?: Partial<OrganisationProject>) {
        Object.assign(this, props)
    }

    /**
     * <project>-<organisation>
     */
    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Organisation, {nullable: true})
    organisation!: Organisation

    @Index_()
    @ManyToOne_(() => Project, {nullable: true})
    project!: Project

    @Column_("bool", {nullable: false})
    vouch!: boolean

    @Column_("int4", {nullable: false})
    count!: number
}
