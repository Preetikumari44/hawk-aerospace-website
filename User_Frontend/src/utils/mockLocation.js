export const getCurrentLocationDemo = (onSuccess) => {
    // Simulate GPS delay
    setTimeout(() => {
        onSuccess({
            coords: {
                latitude: 19.9975,
                longitude: 73.7898,
                accuracy: 5,
                altitude: 600,
            },
            mocked: true,
            address: "Kotamgaon, Nashik, Maharashtra (Demo GPS)"
        });
    }, 500);
};