import { NavLink } from 'react-router';
import { LinkButton, buttonVariants } from "~/components/ui/button"
import { Separator } from '~/components/ui/separator';
export default function SiteHeader() {
    return (
        <>
            <header className="flex mx-auto h-16 w-full max-w-7xl items-center gap-6 px-4 sm:px-6">
                <NavLink
                    to="/"
                    end
                    className="shrink-0 font-heading text-lg font-semibold tracking-tight"
                >
                    slugify.me
                </NavLink>

                <nav aria-label="primary-navigation">
                    <ul className="flex gap-1">
                        <li>
                            <NavLink
                                to="/about"
                                className={({ isActive }) =>
                                    buttonVariants({
                                        variant: isActive ? 'secondary' : 'ghost',
                                        size: 'sm'
                                    })
                                }
                            >
                                About
                            </NavLink>
                            <NavLink
                                to="/faq"
                                className={({ isActive }) =>
                                    buttonVariants({
                                        variant: isActive ? 'secondary' : 'ghost',
                                        size: 'sm'
                                    })
                                }
                            >
                                FAQ
                            </NavLink>
                        </li>
                    </ul>
                </nav>
                <LinkButton
                    href="https://github.com/joshuamae/slugify.me"
                    target="_blank"
                    rel="noreferrer"
                    variant="outline"
                    size="icon"
                    className="ml-auto"
                    aria-label="View source on GitHub"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
                    </svg>
                </LinkButton>
            </header>
            <Separator />

        </>

    )
}