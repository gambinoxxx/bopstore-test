import StoreLayout from "@/components/store/StoreLayout";

export const metadata = {
    title: "Perfect-Lens. - Store Dashboard",
    description: "Perfect-Lens. - Store Dashboard",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
            <StoreLayout>
                {children}
            </StoreLayout>
        </>
    );
}
