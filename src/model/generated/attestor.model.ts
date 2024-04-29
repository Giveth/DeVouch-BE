import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToMany as OneToMany_} from "typeorm"
import {AttestorOrganisation} from "./attestorOrganisation.model"

@Entity_()
export class Attestor {
    constructor(props?: Partial<Attestor>) {
        Object.assign(this, props)
    }

    /**
     * Attestor ID - account address
     */
    @PrimaryColumn_()
    id!: string

    /**
     * Attestor Organization
     */
    @OneToMany_(() => AttestorOrganisation, e => e.attestor)
    organizations!: AttestorOrganisation[]
}
