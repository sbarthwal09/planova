import {Box} from "lucide-react";
import {useOutletContext} from "react-router";
import Button from "./ui/Button";

const Navbar = () => {
    const {authState, signIn, signOut} = useOutletContext<{
        authState: AuthState;
        signIn: () => Promise<boolean>;
        signOut: () => Promise<boolean>;
    }>();
    const {isSignedIn, username} = authState;

    const handleAuthClick = async () => {
        if(isSignedIn){
            try{
                await signOut();
            }catch(e){
                console.error(`Puter sign out failed: ${e}`);
            }
            return;
        }

        try{
            await signIn();
        }catch (e){
            console.error(`Puter sign in failed: ${e}`);
        }
    };

    return(
        <header className="navbar">
            <nav className="inner">
                <div className="left">
                    <div className="brand">
                        <Box className="logo" />
                        <span className="name">
                            Planova
                        </span>
                    </div>
                    <ul className="links">
                        <a href="#">Product</a>
                        <a href="#">Pricing</a>
                        <a href="#">Community</a>
                        <a href="#">Enterprise</a>
                    </ul>
                </div>



                <div className="actions">
                    {isSignedIn ? (
                        <>
                        <span className="greetings">
                            {username ? `Hi, ${username}` : 'Signed in'}
                        </span>
                            <Button size="sm" onClick={handleAuthClick} className="btn">
                                Log out
                            </Button>
                        </>
                        ) : (
                            <>
                    <Button onClick={handleAuthClick} size="sm" variant="ghost">
                        Log In
                    </Button>
                    <a href="#upload" className="cta">Get Started</a>
                            </>
                    )}
                </div>



            </nav>
        </header>
    )
}

export default Navbar;