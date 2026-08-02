import React from 'react';

const Skeleton = ({ h }) => (
    <div className={`w-full ${h} bg-slate-100 dark:bg-slate-800 animate-pulse`} />
);

export default Skeleton;
