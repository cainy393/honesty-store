import React from 'react';
import { Back } from '../chrome/link';
import Page from '../chrome/page';

export default ({ params: { storeId } }) =>
    <Page left={<Back/>}
        title="Privacy Policy"
        storeId={storeId}
        invert={true}
        nav={false}>
        <div>
            <p>Lorem ipsum...</p>
        </div>
    </Page>;