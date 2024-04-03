import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToMany as OneToMany_} from "typeorm"
import {AttesterOrganisation} from "./attesterOrganisation.model"

@Entity_()
export class Attester {
    constructor(props?: Partial<Attester>) {
        Object.assign(this, props)
    }

    /**
     * Attester ID - account address
     */
    @PrimaryColumn_()
    id!: string

    /**
     * Attester Organization
     */
    @OneToMany_(() => AttesterOrganisation, e => e.attester)
    organizations!: AttesterOrganisation[]
}
