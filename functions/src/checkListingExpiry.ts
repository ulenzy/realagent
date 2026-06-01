import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const scheduledListingExpiry = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(async (context) => {
    const now = new Date().toISOString();
    try {
      const snapshot = await db
        .collection('listingRequests')
        .where('status', '==', 'Approved')
        .get();

      const promises: Promise<any>[] = [];

      snapshot.forEach((doc) => {
        const listing = doc.data();
        if (listing.monthlyFeeExpiresAt && listing.monthlyFeeExpiresAt < now) {
          // Update listing status and listingFeeStatus
          const updateListingPromise = doc.ref.update({
            status: 'Inactive',
            listingFeeStatus: 'Monthly Unpaid'
          });
          promises.push(updateListingPromise);

          // Find matching properties
          const findPropsPromise = db
            .collection('properties')
            .where('listingRequestId', '==', doc.id)
            .get()
            .then((propSnap) => {
              const propPromises: Promise<any>[] = [];
              propSnap.forEach((propDoc) => {
                propPromises.push(propDoc.ref.update({ status: 'Inactive' }));
              });
              return Promise.all(propPromises);
            });
          promises.push(findPropsPromise);
        }
      });

      await Promise.all(promises);
      console.log('Successfully checked and processed expired listings at ' + now);
      return null;
    } catch (error) {
      console.error('Error processing listing expiration scheduled task:', error);
      throw error;
    }
  });
