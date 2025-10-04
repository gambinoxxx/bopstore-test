import StoreLayout from "@/components/store/StoreLayout";

export const metadata = {
    title: "Bop-store. - Store Dashboard",
    description: "Bop-store. - Store Dashboard",
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
