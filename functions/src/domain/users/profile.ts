import { BaseDomain } from '../common'

export class Profile extends BaseDomain {
  constructor (
    public avatar: string,
    public fullName: string,
    public banner: string,
    public tagLine: string,
    public creationDate: number,
    public email?: string | null
  ) {
    super()

  }

}
