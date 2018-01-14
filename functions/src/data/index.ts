import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

export const adminDB = admin.initializeApp(functions.config().firebase)
export const firestoreDB = adminDB.firestore()