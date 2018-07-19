import { BaseDomain } from '../common'

export class RegisterUserResult extends BaseDomain {

  private _uid: string
  constructor (uid: string) {
    super()

    this._uid = uid
  }
    /**
     * User identifier
     */

  public get uid (): string {
    return this._uid
  }
}
