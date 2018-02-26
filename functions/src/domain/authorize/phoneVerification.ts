export class PhoneVerification {
    constructor(
        public id: string,
        public code: string,
        public phoneNumber: string,
        public creationDate: number,
        public remoteIpAddress: string,
        public userId: string,
        public isVerified = false
    ) {}
}