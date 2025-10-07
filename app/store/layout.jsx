import StoreLayout from "@/components/store/StoreLayout";

export const metadata = {
    title: "Bopstore. - Store Dashboard",
    description: "Bopstore. - Store Dashboard",
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
